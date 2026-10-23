import { describe, expect, it } from 'vitest';
import { groupByDay, type WeeklyEntry } from '../WeeklyTimeline';

const entry = (id: string, date: string): WeeklyEntry => ({
  id,
  date,
  is_private: false,
  quote: '문장',
  note: null,
  user_books: { books: { title: '책' } },
});

describe('groupByDay — 기록한 날짜로 묶고 최근 날부터', () => {
  it('같은 날 기록은 받은 순서를 지킨 채 한 묶음', () => {
    const groups = groupByDay([
      entry('a', '2026-10-20'),
      entry('b', '2026-10-22'),
      entry('c', '2026-10-20'),
    ]);
    expect(groups.map(([d, items]) => [d, items.map((i) => i.id)])).toEqual([
      ['2026-10-22', ['b']],
      ['2026-10-20', ['a', 'c']],
    ]);
  });
});
