import { describe, expect, it } from 'vitest';
import { CONSENTED_AT_KEY, consentStamp, hasConsented } from '@/lib/auth/consent';

describe('hasConsented — user_metadata의 동의 표식', () => {
  it('비어 있지 않은 문자열이면 동의한 것', () => {
    expect(hasConsented({ [CONSENTED_AT_KEY]: '2026-09-06T00:00:00.000Z' })).toBe(true);
  });

  it('메타데이터가 없거나 키가 없거나 문자열이 아니면 동의하지 않은 것', () => {
    expect(hasConsented(undefined)).toBe(false);
    expect(hasConsented(null)).toBe(false);
    expect(hasConsented({})).toBe(false);
    expect(hasConsented({ [CONSENTED_AT_KEY]: null })).toBe(false);
    expect(hasConsented({ [CONSENTED_AT_KEY]: '' })).toBe(false);
    expect(hasConsented({ [CONSENTED_AT_KEY]: '   ' })).toBe(false);
    expect(hasConsented({ [CONSENTED_AT_KEY]: true })).toBe(false);
    expect(hasConsented({ [CONSENTED_AT_KEY]: 1725580800 })).toBe(false);
  });
});

describe('consentStamp', () => {
  it('ISO 시각 문자열을 만든다', () => {
    expect(consentStamp(new Date('2026-09-06T01:02:03.000Z'))).toBe('2026-09-06T01:02:03.000Z');
    expect(hasConsented({ [CONSENTED_AT_KEY]: consentStamp() })).toBe(true);
  });
});
