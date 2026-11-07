import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const fetchReflectionSummaries = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ rpc }),
}));
vi.mock('@/lib/reflections/server', () => ({
  fetchReflectionSummaries: (ids: string[]) => fetchReflectionSummaries(ids),
}));

const { fetchSocialFeedItems } = await import('../fetchSocialFeedEntries');

const entryItem = (id: string) => ({
  kind: 'entry',
  entry: { id, quote: '문장' },
  profile: { id: 'p1' },
  initialLiked: false,
  initialLikeCount: 0,
  initialCommentCount: 0,
});
const excerptItem = {
  kind: 'monthly_excerpt',
  id: 'x1',
  month: '2026-03',
  sharedAt: '2026-04-01T00:00:00Z',
  profile: { id: 'p1' },
  coverQuote: '표지',
  coverBookTitle: '책',
  quoteCount: 3,
  bookCount: 2,
  initialLiked: false,
  initialLikeCount: 0,
  initialCommentCount: 0,
};

beforeEach(() => {
  rpc.mockReset();
  fetchReflectionSummaries.mockReset();
  fetchReflectionSummaries.mockResolvedValue({ e1: { count: 1 } });
});

describe('fetchSocialFeedItems', () => {
  it('새 RPC를 부르고 쪽 번호와 크기를 넘긴다', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await fetchSocialFeedItems(2, 5);
    expect(rpc).toHaveBeenCalledWith('get_social_feed_items', { p_page: 2, p_limit: 5 });
  });

  it('덧붙인 생각 요약은 기록 항목에만 붙이고 순서를 지킨다', async () => {
    rpc.mockResolvedValue({ data: [entryItem('e1'), excerptItem, entryItem('e2')], error: null });
    const items = await fetchSocialFeedItems(0, 10);

    expect(fetchReflectionSummaries).toHaveBeenCalledWith(['e1', 'e2']);
    expect(items.map((i) => i.kind)).toEqual(['entry', 'monthly_excerpt', 'entry']);
    expect(items[1]).toEqual(excerptItem);
    const [first, , last] = items;
    if (first.kind !== 'entry' || last.kind !== 'entry') throw new Error('kind');
    expect(first.entry.reflectionSummary).toEqual({ count: 1 });
    expect(last.entry.reflectionSummary).toBeNull();
  });

  it('요약을 읽지 못해도 발췌집 항목은 그대로 온다', async () => {
    fetchReflectionSummaries.mockResolvedValue(null);
    rpc.mockResolvedValue({ data: [excerptItem], error: null });
    expect(await fetchSocialFeedItems(0, 10)).toEqual([excerptItem]);
  });

  it('RPC가 실패하면 알린다', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    await expect(fetchSocialFeedItems(0, 10)).rejects.toThrow(
      '친구들의 기록을 불러오지 못했습니다.'
    );
  });
});
