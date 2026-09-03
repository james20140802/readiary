import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGetUser = vi.fn();
const runQuery = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: authGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => runQuery(),
          }),
        }),
      }),
    }),
  })),
}));

import { fetchNotifications } from '@/lib/notifications/fetchNotifications';

describe('fetchNotifications', () => {
  beforeEach(() => {
    authGetUser.mockReset();
    runQuery.mockReset();
  });

  it('로그인하지 않았으면 빈 목록과 error: false를 반환한다', async () => {
    authGetUser.mockResolvedValue({ data: { user: null } });

    const result = await fetchNotifications();

    expect(result).toEqual({ items: [], error: false });
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('쿼리가 실패하면 빈 배열이 아니라 error: true로 구분해서 반환한다', async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    runQuery.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await fetchNotifications();

    expect(result).toEqual({ items: [], error: true });
  });

  it('성공하면 매핑된 항목과 error: false를 반환한다', async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    runQuery.mockResolvedValue({
      data: [
        {
          id: 'n1',
          type: 'like',
          created_at: '2026-01-01T00:00:00Z',
          read_at: null,
          entry_id: 'e1',
          actor: { nickname: '상추', profile_image: null },
        },
      ],
      error: null,
    });

    const result = await fetchNotifications();

    expect(result.error).toBe(false);
    expect(result.items).toEqual([
      {
        id: 'n1',
        type: 'like',
        createdAt: '2026-01-01T00:00:00Z',
        readAt: null,
        entryId: 'e1',
        actorNickname: '상추',
        actorProfileImage: null,
      },
    ]);
  });
});
