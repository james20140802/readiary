import { describe, expect, it } from 'vitest';
import { MONTH_PAGE_BOOKS, MONTH_PAGE_QUOTES, summarizeByMonth } from '../monthlySummary';

describe('summarizeByMonth', () => {
  it('최근 N개월을 최신순으로, 기록 없는 달은 0', () => {
    const entries = [{ date: '2026-06-15' }, { date: '2026-08-01' }, { date: '2026-08-27' }];
    expect(summarizeByMonth(entries, '2026-08-27', 3)).toEqual([
      { label: '2026년 8월', count: 2, books: [], quotes: [] },
      { label: '2026년 7월', count: 0, books: [], quotes: [] },
      { label: '2026년 6월', count: 1, books: [], quotes: [] },
    ]);
  });
  it('연 경계를 넘어간다', () => {
    const rows = summarizeByMonth([{ date: '2025-12-31' }], '2026-01-15', 2);
    expect(rows.map((r) => [r.label, r.count])).toEqual([
      ['2026년 1월', 0],
      ['2025년 12월', 1],
    ]);
  });
  it('달 페이지용 책 제목과 인용은 최근 것부터, 제목은 중복 없이, 개수 상한까지', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      quote: i % 2 === 0 ? `인용 ${i}` : '  ',
      bookTitle: `책 ${i % 8}`,
    }));
    const [aug] = summarizeByMonth(entries, '2026-08-31', 1);
    expect(aug.count).toBe(10);
    expect(aug.quotes).toEqual(['인용 8', '인용 6', '인용 4'].slice(0, MONTH_PAGE_QUOTES));
    expect(aug.books).toHaveLength(MONTH_PAGE_BOOKS);
    expect(aug.books.slice(0, 3)).toEqual(['책 1', '책 0', '책 7']);
    expect(new Set(aug.books).size).toBe(aug.books.length);
  });
});
