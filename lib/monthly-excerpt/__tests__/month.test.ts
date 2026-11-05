import { describe, expect, it } from 'vitest';
import { dayLabel, isFinishedMonth, isMonthKey, monthLabel, shortMonthLabel } from '../month';

describe('isFinishedMonth', () => {
  it('KST 오늘이 속한 달은 아직 끝나지 않았다', () => {
    expect(isFinishedMonth('2026-03', '2026-03-31')).toBe(false);
    expect(isFinishedMonth('2026-03', '2026-03-01')).toBe(false);
  });
  it('다음 달 1일부터 끝난 달이다', () => {
    expect(isFinishedMonth('2026-03', '2026-04-01')).toBe(true);
    expect(isFinishedMonth('2025-12', '2026-01-01')).toBe(true);
  });
  it('미래의 달은 끝나지 않았다', () => {
    expect(isFinishedMonth('2026-05', '2026-04-10')).toBe(false);
  });
});

describe('라벨과 달 키', () => {
  it('monthLabel / shortMonthLabel', () => {
    expect(monthLabel('2026-03')).toBe('2026년 3월');
    expect(monthLabel('2025-12')).toBe('2025년 12월');
    expect(shortMonthLabel('2026-03')).toBe('3월');
  });
  it('isMonthKey', () => {
    expect(isMonthKey('2026-03')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-00')).toBe(false);
    expect(isMonthKey('2026-3')).toBe(false);
    expect(isMonthKey('2026-03-01')).toBe(false);
  });
});

describe('dayLabel', () => {
  it('달과 날만 적고 앞의 0을 뺀다', () => {
    expect(dayLabel('2026-03-04')).toBe('3월 4일');
    expect(dayLabel('2025-12-31')).toBe('12월 31일');
  });
  it('읽지 못하는 값은 그대로 둔다', () => {
    expect(dayLabel('없음')).toBe('없음');
  });
});
