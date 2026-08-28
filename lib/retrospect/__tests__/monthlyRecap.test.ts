import { describe, expect, it } from 'vitest';
import { isMonthlyRecapDay, prevMonthRange } from '../monthlyRecap';

describe('isMonthlyRecapDay', () => {
  it('매월 1일만 true', () => {
    expect(isMonthlyRecapDay('2026-09-01')).toBe(true);
    expect(isMonthlyRecapDay('2026-08-27')).toBe(false);
  });
});

describe('prevMonthRange', () => {
  it('지난달 1일~말일과 라벨', () => {
    expect(prevMonthRange('2026-09-01')).toEqual({
      start: '2026-08-01', end: '2026-08-31', label: '2026년 8월',
    });
  });
  it('연 경계 — 1월 1일이면 지난해 12월', () => {
    expect(prevMonthRange('2026-01-01')).toEqual({
      start: '2025-12-01', end: '2025-12-31', label: '2025년 12월',
    });
  });
  it('말일이 짧은 달 — 3월 1일이면 2월 28일까지', () => {
    expect(prevMonthRange('2026-03-01').end).toBe('2026-02-28');
  });
});
