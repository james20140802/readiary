import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
const id = '11111111-1111-4111-8111-111111111111';
const read = (entryId = id) =>
  GET(new Request('https://readiary.net/api/entries/' + entryId + '/read'), {
    params: Promise.resolve({ entry_id: entryId }),
  });
function setup({
  owner = 'viewer',
  privateEntry = false,
  friend = false,
  missing = false,
  error = false,
  signedIn = true,
} = {}) {
  vi.mocked(getServerUser).mockResolvedValue({
    data: { user: signedIn ? { id: 'viewer' } : null },
    error: null,
  } as never);
  const entry = {
    id,
    date: '2026-09-12',
    from_page: null,
    to_page: null,
    quote: '긴 문장\n끝',
    note: '생각',
    is_private: privateEntry,
    user_books: { user_id: owner, books: { title: '책' } },
  };
  const query = (result: unknown) => {
    const q = {
      select: vi.fn(),
      eq: vi.fn(),
      or: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue(result),
    };
    for (const name of ['select', 'eq', 'or', 'limit'] as const) q[name].mockReturnValue(q);
    return q;
  };
  const entries = query({ data: missing ? null : entry, error: error ? {} : null });
  const friends = query({ data: friend ? { id: 'friendship' } : null, error: null });
  const from = vi.fn((table: string) => (table === 'entries' ? entries : friends));
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);
  return { from, entries, friends };
}
describe('on-demand record reading', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns only the reading payload for an owner, including private entries', async () => {
    const { from, entries } = setup({ privateEntry: true });
    const response = await read();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id,
      bookTitle: '책',
      date: '2026-09-12',
      fromPage: null,
      toPage: null,
      quote: '긴 문장\n끝',
      note: '생각',
    });
    expect(entries.eq).toHaveBeenCalledWith('id', id);
    expect(from).not.toHaveBeenCalledWith('friends');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('allows accepted friends only for public records', async () => {
    const { friends } = setup({ owner: 'other', friend: true });
    expect((await read()).status).toBe(200);
    expect(friends.eq).toHaveBeenCalledWith('status', 'accepted');
    setup({ owner: 'other', friend: true, privateEntry: true });
    expect((await read()).status).toBe(404);
  });
  it('does not disclose missing, deleted, or nonfriend records', async () => {
    setup({ missing: true });
    const missing = await read();
    setup({ owner: 'other' });
    const nonfriend = await read();
    expect(missing.status).toBe(404);
    expect(nonfriend.status).toBe(404);
    expect(await missing.json()).toEqual(await nonfriend.json());
  });
  it('rechecks access on reopening after privacy or friendship changes', async () => {
    setup({ owner: 'other', friend: true });
    expect((await read()).status).toBe(200);
    setup({ owner: 'other', friend: false });
    expect((await read()).status).toBe(404);
    setup({ owner: 'other', friend: true, privateEntry: true });
    expect((await read()).status).toBe(404);
  });
  it('returns retryable errors without database details', async () => {
    setup({ error: true });
    const response = await read();
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('uses the session-expired contract and does not query anonymous requests', async () => {
    const { from } = setup({ signedIn: false });
    const response = await read();
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('session_expired');
    expect(from).not.toHaveBeenCalled();
  });
  it('rejects malformed identifiers without querying', async () => {
    const { from } = setup();
    expect((await read('invalid')).status).toBe(404);
    expect(from).not.toHaveBeenCalled();
  });
});
