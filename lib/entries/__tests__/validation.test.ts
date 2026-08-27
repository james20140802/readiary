import { describe, expect, it, vi, afterEach } from 'vitest';
import { hasEntryContent, isFutureKSTDate } from '../validation';

describe('hasEntryContent', () => {
  it('둘 다 비어 있으면 false (공백만 있는 문자열 포함)', () => {
    expect(hasEntryContent(null, null)).toBe(false);
    expect(hasEntryContent(undefined, undefined)).toBe(false);
    expect(hasEntryContent('   ', '')).toBe(false);
  });

  it('한쪽에라도 실질 내용이 있으면 true', () => {
    expect(hasEntryContent('문장', null)).toBe(true);
    expect(hasEntryContent(null, '생각')).toBe(true);
    expect(hasEntryContent('문장', '생각')).toBe(true);
  });
});

describe('isFutureKSTDate', () => {
  afterEach(() => vi.useRealTimers());

  it('KST 기준 오늘·과거는 false, 미래는 true', () => {
    // 2026-08-26T16:00:00Z === 2026-08-27 01:00 KST → KST 오늘은 2026-08-27
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T16:00:00Z'));
    expect(isFutureKSTDate('2026-08-27')).toBe(false);
    expect(isFutureKSTDate('2026-08-26')).toBe(false);
    expect(isFutureKSTDate('2026-08-28')).toBe(true);
  });
});
