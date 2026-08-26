import { describe, expect, it } from 'vitest';
import { toKSTDateString } from '@/lib/dates';

describe('toKSTDateString', () => {
  it('UTC 15:00 = KST 다음날 00:00 이후이므로 다음날로 판정한다', () => {
    expect(toKSTDateString(new Date('2026-08-24T15:00:00Z'))).toBe('2026-08-25');
  });

  it('UTC 14:59 = KST 23:59이므로 같은 날로 판정한다', () => {
    expect(toKSTDateString(new Date('2026-08-24T14:59:00Z'))).toBe('2026-08-24');
  });

  it('KST 자정 직후(UTC 전날 15:00:01)도 다음날로 판정한다', () => {
    expect(toKSTDateString(new Date('2026-12-31T15:00:01Z'))).toBe('2027-01-01');
  });
});
