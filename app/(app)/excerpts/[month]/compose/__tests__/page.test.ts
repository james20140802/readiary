import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMyMonthlyExcerpt = vi.fn();
const fetchMonthBooks = vi.fn();
const fetchFirstCandidates = vi.fn();
const todayKST = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NOT_FOUND');
});

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/dates', () => ({ todayKST: () => todayKST() }));
vi.mock('@/lib/monthly-excerpt/server', () => ({
  fetchMyMonthlyExcerpt,
  fetchMonthBooks,
  fetchFirstCandidates,
}));
vi.mock('@/components/monthly-excerpt/ComposeFlow', () => ({ default: () => null }));

const { default: Page } = await import('../page');
const open = (month: string) => Page({ params: Promise.resolve({ month }) });
// 서버 컴포넌트가 돌려준 요소의 props를 꺼낸다
const propsOf = async (month: string) =>
  ((await open(month)) as unknown as { props: Record<string, unknown> }).props;

const book = { userBookId: 'ub1', title: '책', quoteCount: 2 };
const page = { items: [], hasMore: false };

beforeEach(() => {
  vi.clearAllMocks();
  todayKST.mockReturnValue('2026-04-01');
  fetchMyMonthlyExcerpt.mockResolvedValue(null);
  fetchMonthBooks.mockResolvedValue([book]);
  fetchFirstCandidates.mockResolvedValue(page);
});

describe('달의 발췌집 엮기 페이지', () => {
  it.each(['2026-13', '2026-3', 'abc'])('형식이 틀린 달 %s는 404, 조회도 안 한다', async (m) => {
    await expect(open(m)).rejects.toThrow('NOT_FOUND');
    expect(fetchMyMonthlyExcerpt).not.toHaveBeenCalled();
  });

  it('끝나지 않은 달은 404다 (KST 오늘이 속한 달 포함)', async () => {
    await expect(open('2026-04')).rejects.toThrow('NOT_FOUND');
    await expect(open('2026-05')).rejects.toThrow('NOT_FOUND');
    expect(fetchMonthBooks).not.toHaveBeenCalled();
  });

  it('KST 4월 1일 새벽에는 3월을 엮을 수 있다', async () => {
    const props = await propsOf('2026-03');
    expect(props).toMatchObject({
      month: '2026-03',
      books: [book],
      firstPage: page,
      initialPicks: [],
    });
  });

  it('칩이나 후보가 실패해도 화면은 그리고 그 부분만 null로 넘긴다', async () => {
    fetchMonthBooks.mockRejectedValue(new Error('x'));
    expect(await propsOf('2026-03')).toMatchObject({ books: null, firstPage: page });
    fetchMonthBooks.mockResolvedValue([book]);
    fetchFirstCandidates.mockRejectedValue(new Error('x'));
    expect(await propsOf('2026-03')).toMatchObject({ books: [book], firstPage: null });
  });

  it('기존 발췌집을 불러오지 못한 것은 없음으로 오해하지 않고 던진다', async () => {
    fetchMyMonthlyExcerpt.mockRejectedValue(new Error('Monthly excerpt unavailable'));
    await expect(open('2026-03')).rejects.toThrow('Monthly excerpt unavailable');
  });

  it('이미 엮은 발췌집이 있으면 그 문장을 순서대로 initialPicks로 넘긴다', async () => {
    fetchMyMonthlyExcerpt.mockResolvedValue({
      id: 'x',
      month: '2026-03',
      isShared: false,
      firstSharedAt: null,
      items: [
        {
          position: 0,
          entryId: 'e1',
          date: '2026-03-02',
          quote: '문장',
          note: '생각',
          isPrivate: true,
          fromPage: 3,
          toPage: null,
          book: { id: 'b1', title: '책', author: '저자' },
        },
      ],
    });
    const props = await propsOf('2026-03');
    expect(props.initialPicks).toEqual([
      expect.objectContaining({ entryId: 'e1', hasNote: true, isPrivate: true, bookId: 'b1' }),
    ]);
  });
});
