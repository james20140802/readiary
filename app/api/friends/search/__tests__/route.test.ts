import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

const profile = {
  id: 'friend-1',
  name: '독자',
  nickname: 'reader',
  tag: '1234',
  profile_image: null,
  bio: '책 읽기',
  created_at: '2026-01-01T00:00:00Z',
};
const storedProfile = {
  ...profile,
  featured_entry_id: 'private-entry',
  bookmark_user_book_id: 'private-book',
  future_private_field: 'must not leak',
};

function setup({
  user = { id: 'user-1' } as { id: string } | null,
  found = true,
  friends = [] as { user_id: string; friend_id: string }[],
} = {}) {
  const profileSelect = vi.fn((columns: string) => ({
    eq: () => ({
      eq: () => ({
        single: async () => ({
          data: found
            ? columns === '*'
              ? storedProfile
              : Object.fromEntries(
                  columns.split(',').map((column) => {
                    const key = column.trim() as keyof typeof storedProfile;
                    return [key, storedProfile[key]];
                  })
                )
            : null,
          error: null,
        }),
      }),
    }),
  }));
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: profileSelect };
    if (table === 'friends')
      return { select: () => ({ or: async () => ({ data: friends, error: null }) }) };
    throw new Error(`Unexpected table: ${table}`);
  });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from,
  } as never);
  return { from };
}

function request(body: unknown = { nickname: 'reader', tag: '1234' }) {
  return new NextRequest('http://localhost/api/friends/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/friends/search', () => {
  it('returns only the public profile allowlist, even when extra private columns exist', async () => {
    setup();
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile, isFriend: false });
  });

  it.each([
    [{ user_id: 'user-1', friend_id: 'friend-1' }],
    [{ user_id: 'friend-1', friend_id: 'user-1' }],
  ])('preserves existing friend detection for relationship %j', async (friend) => {
    setup({ friends: [friend] });
    expect(await (await POST(request())).json()).toEqual({ profile, isFriend: true });
  });

  it('does not search profiles without a session', async () => {
    const { from } = setup({ user: null });
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized', code: 'session_expired' });
    expect(from).not.toHaveBeenCalled();
  });

  it('preserves not-found responses', async () => {
    setup({ found: false });
    expect((await POST(request())).status).toBe(404);
  });

  it('preserves required search input validation', async () => {
    const { from } = setup();
    expect((await POST(request({ nickname: 'reader' }))).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
