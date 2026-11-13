import { describe, expect, it } from 'vitest';
import { diaryShelf, formatPublishedDate, ordinalCount, ordinalVolume } from '../meModel';
describe('ordinal', () => {
  it('세는 서수 — 첫 번째, 두 번째, 세 번째…', () => {
    expect(ordinalCount(1)).toBe('첫 번째');
    expect(ordinalCount(2)).toBe('두 번째');
    expect(ordinalCount(3)).toBe('세 번째');
    expect(ordinalCount(4)).toBe('네 번째');
    expect(ordinalCount(11)).toBe('11번째');
  });
  it('권 서수 — 첫째 권, 둘째 권, 셋째 권…', () => {
    expect(ordinalVolume(1)).toBe('첫째 권');
    expect(ordinalVolume(3)).toBe('셋째 권');
    expect(ordinalVolume(12)).toBe('12번째 권');
  });
});

describe('diaryShelf', () => {
  it('가입한 해부터 해마다 한 권 — 맨 앞이 올해', () => {
    const d = diaryShelf('2024-03-08T10:00:00Z', '2026-10-23');
    expect(d.count).toBe(3);
    expect(d.firstYear).toBe(2024);
    expect(d.years).toEqual([2026, 2025, 2024]);
  });
  it('세 권까지만 그린다', () => {
    expect(diaryShelf('2020-01-01T00:00:00Z', '2026-10-23').years).toEqual([2026, 2025, 2024]);
  });
  it('가입일을 모르면 올해 한 권', () => {
    const d = diaryShelf(null, '2026-10-23');
    expect(d.count).toBe(1);
    expect(d.firstYear).toBe(2026);
  });
  it('한국 시간으로 해를 센다 — UTC 12월 31일 밤은 KST 새해', () => {
    expect(diaryShelf('2025-12-31T16:00:00Z', '2026-10-23').firstYear).toBe(2026);
  });
});

describe('formatPublishedDate', () => {
  it('한국 시간 날짜로', () => {
    expect(formatPublishedDate('2026-03-07T16:30:00Z')).toBe('2026년 3월 8일');
  });
  it('없거나 잘못되면 null', () => {
    expect(formatPublishedDate(null)).toBeNull();
    expect(formatPublishedDate('nope')).toBeNull();
  });
});
