import { describe, expect, it } from 'vitest';
import { summarizeByMonth } from '../monthlySummary';

describe('summarizeByMonth', () => {
  it('최근 N개월을 최신순으로, 기록 없는 달은 0', () => {
    const dates = ['2026-08-27', '2026-08-01', '2026-06-15'];
    expect(summarizeByMonth(dates, '2026-08-27', 3)).toEqual([
      { label: '2026년 8월', count: 2 },
      { label: '2026년 7월', count: 0 },
      { label: '2026년 6월', count: 1 },
    ]);
  });
  it('연 경계를 넘어간다', () => {
    const rows = summarizeByMonth(['2025-12-31'], '2026-01-15', 2);
    expect(rows).toEqual([
      { label: '2026년 1월', count: 0 },
      { label: '2025년 12월', count: 1 },
    ]);
  });
});
