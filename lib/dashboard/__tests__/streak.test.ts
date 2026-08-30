import { describe, expect, it } from 'vitest';
import { weekDatesKST, calcStreak, calcWeekActivity, countWeekEntries } from '../streak';

// 2026-08-27은 목요일. 그 주의 일요일은 2026-08-23.
describe('weekDatesKST', () => {
  it('일요일 시작 7일을 돌려준다', () => {
    expect(weekDatesKST('2026-08-27')).toEqual([
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
    ]);
  });
  it('일요일 당일이면 그 날이 첫 칸이다', () => {
    expect(weekDatesKST('2026-08-23')[0]).toBe('2026-08-23');
  });
});

describe('calcStreak', () => {
  it('오늘 포함 연속 기록일을 센다', () => {
    const rec = new Set(['2026-08-27', '2026-08-26', '2026-08-25', '2026-08-23']);
    expect(calcStreak(rec, '2026-08-27')).toBe(3);
  });
  it('오늘 기록이 없으면 어제부터 센다 (아직 안 쓴 오늘이 스트릭을 끊지 않는다)', () => {
    const rec = new Set(['2026-08-26', '2026-08-25']);
    expect(calcStreak(rec, '2026-08-27')).toBe(2);
  });
  it('오늘도 어제도 없으면 0', () => {
    expect(calcStreak(new Set(['2026-08-20']), '2026-08-27')).toBe(0);
  });
});

describe('calcWeekActivity', () => {
  it('이번 주 7일의 기록 여부 배열', () => {
    const rec = new Set(['2026-08-24', '2026-08-27']);
    expect(calcWeekActivity(rec, '2026-08-27')).toEqual([
      false,
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
  });
});

describe('countWeekEntries', () => {
  it('이번 주에 속한 기록만, 같은 날 중복 포함으로 센다', () => {
    const dates = ['2026-08-27', '2026-08-27', '2026-08-23', '2026-08-22', '2026-08-30'];
    expect(countWeekEntries(dates, '2026-08-27')).toBe(3);
  });
});
