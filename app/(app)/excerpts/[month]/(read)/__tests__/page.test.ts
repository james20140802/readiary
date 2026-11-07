import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMyMonthlyExcerpt = vi.fn();
const fetchMonthlyExcerptReactions = vi.fn();
const getUser = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NOT_FOUND');
});
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock('next/navigation', () => ({ notFound, redirect }));
vi.mock('@/lib/monthly-excerpt/server', () => ({
  fetchMyMonthlyExcerpt,
  fetchMonthlyExcerptReactions,
}));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));
vi.mock('@/components/monthly-excerpt/MonthlyExcerptOwnerView', () => ({ default: () => null }));

const { default: Page } = await import('../page');
const open = (month: string) => Page({ params: Promise.resolve({ month }) });

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
});

describe('달의 발췌집 읽기 페이지', () => {
  it.each(['2026-13', '2026-3', 'abc', '2026-03-01'])(
    '형식이 틀린 달 %s는 404, 조회도 안 한다',
    async (m) => {
      await expect(open(m)).rejects.toThrow('NOT_FOUND');
      expect(fetchMyMonthlyExcerpt).not.toHaveBeenCalled();
    }
  );
  it('아직 엮지 않았으면 엮기로 보낸다', async () => {
    fetchMyMonthlyExcerpt.mockResolvedValue(null);
    await expect(open('2026-03')).rejects.toThrow('REDIRECT:/excerpts/2026-03/compose');
  });
  it('조회 실패는 없음으로 오해하지 않고 그대로 던진다', async () => {
    fetchMyMonthlyExcerpt.mockRejectedValue(new Error('Monthly excerpt unavailable'));
    await expect(open('2026-03')).rejects.toThrow('Monthly excerpt unavailable');
    expect(redirect).not.toHaveBeenCalled();
  });
  it('엮었으면 화면을 그린다', async () => {
    const excerpt = { id: 'x', month: '2026-03', isShared: false, firstSharedAt: null, items: [] };
    fetchMyMonthlyExcerpt.mockResolvedValue(excerpt);
    const el = await open('2026-03');
    expect(el.props.excerpt).toBe(excerpt);
  });
  it('반응의 첫 수와 내 id를 넘긴다. 수를 못 불러와도 읽기는 막지 않는다', async () => {
    const excerpt = { id: 'x', month: '2026-03', isShared: true, firstSharedAt: null, items: [] };
    const counts = { likeCount: 1, commentCount: 0, liked: false };
    fetchMyMonthlyExcerpt.mockResolvedValue(excerpt);
    fetchMonthlyExcerptReactions.mockResolvedValue(counts);
    const el = await open('2026-03');
    expect(fetchMonthlyExcerptReactions).toHaveBeenCalledWith('x');
    expect(el.props.reactions).toBe(counts);
    expect(el.props.currentUserId).toBe('me');

    fetchMonthlyExcerptReactions.mockResolvedValue(null);
    expect((await open('2026-03')).props.reactions).toBeNull();
  });
});
