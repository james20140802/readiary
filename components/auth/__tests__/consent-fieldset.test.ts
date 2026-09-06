import { describe, expect, it } from 'vitest';
import { NO_CONSENT, isConsentComplete } from '@/components/auth/ConsentFieldset';

describe('isConsentComplete — 만 14세 확인·개인정보·약관 세 항목이 모두 있어야 한다', () => {
  it('처음 상태는 미완료', () => {
    expect(isConsentComplete(NO_CONSENT)).toBe(false);
  });

  it.each([
    ['나이 확인 없음', { age: false, privacy: true, terms: true }],
    ['개인정보 동의 없음', { age: true, privacy: false, terms: true }],
    ['약관 동의 없음', { age: true, privacy: true, terms: false }],
  ])('%s이면 미완료', (_label, consent) => {
    expect(isConsentComplete(consent)).toBe(false);
  });

  it('셋 다 체크하면 완료', () => {
    expect(isConsentComplete({ age: true, privacy: true, terms: true })).toBe(true);
  });
});
