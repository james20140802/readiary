import { describe, expect, it } from 'vitest';
import { adjacentYear, entryYears, yearCells } from '../monthPicker';

const months = [
  { month: '2026-10', entryCount: 23 },
  { month: '2026-03', entryCount: 1 },
  { month: '2023-12', entryCount: 4 },
  { month: '2024-01', entryCount: 2 },
];

describe('monthPicker', () => {
  it('lists years with records, oldest first', () => {
    expect(entryYears(months)).toEqual([2023, 2024, 2026]);
    expect(entryYears([])).toEqual([]);
  });

  it('builds twelve cells for a year, empty months count 0', () => {
    const cells = yearCells(months, 2026);
    expect(cells).toHaveLength(12);
    expect(cells[0]).toEqual({ month: '2026-01', m: 1, entryCount: 0 });
    expect(cells[2]).toEqual({ month: '2026-03', m: 3, entryCount: 1 });
    expect(cells[9]).toEqual({ month: '2026-10', m: 10, entryCount: 23 });
    expect(cells[11].month).toBe('2026-12');
  });

  it('steps to the nearest year with records, skipping empty years', () => {
    const years = entryYears(months);
    expect(adjacentYear(years, 2026, -1)).toBe(2024);
    expect(adjacentYear(years, 2024, 1)).toBe(2026);
    expect(adjacentYear(years, 2023, -1)).toBeNull();
    expect(adjacentYear(years, 2026, 1)).toBeNull();
  });
});
