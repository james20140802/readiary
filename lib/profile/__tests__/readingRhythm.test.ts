import { describe, expect, it } from 'vitest';
import { buildRhythm, rhythmMonthKeys, strongestCell } from '../readingRhythm';

const at = (month: string, day: number, slot: number, count = 1) => ({ month, day, slot, count });

describe('readingRhythm', () => {
  it('오늘이 속한 달부터 거슬러 석 달의 키를 만든다(해 넘김 포함)', () => {
    expect(rhythmMonthKeys('2026-01-10', 3)).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('DB가 센 칸을 달별 판에 놓는다', () => {
    const [, , oct] = buildRhythm([at('2026-10', 6, 3, 2), at('2026-10', 0, 0)], '2026-10-25');
    expect(oct.total).toBe(3);
    expect(oct.cells[6 * 4 + 3]).toBe(2);
    expect(oct.cells[0]).toBe(1);
  });

  it('범위 밖 달과 잘못된 칸은 버린다', () => {
    const months = buildRhythm(
      [at('2026-01', 0, 0), at('2026-10', 7, 0), at('2026-10', 0, 4), at('2026-10', 1, 1, 0)],
      '2026-10-25'
    );
    expect(months.every((m) => m.total === 0)).toBe(true);
  });

  it('두 달 이상 나타난 칸만 습관으로 고르고, 더 많은 달에 나타난 칸이 앞선다', () => {
    const months = buildRhythm(
      [
        at('2026-08', 6, 3),
        at('2026-09', 6, 3),
        at('2026-10', 6, 3),
        at('2026-09', 5, 1, 5),
        at('2026-10', 5, 1, 5),
      ],
      '2026-10-25'
    );
    expect(strongestCell(months)).toEqual({ day: 6, time: 3 });
    expect(strongestCell(months.slice(1))).toEqual({ day: 5, time: 1 });
    expect(strongestCell(months.slice(2))).toBeNull();
  });
});
