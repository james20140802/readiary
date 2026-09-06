import { describe, expect, it } from 'vitest';
import {
  isReauthenticationCodeInvalid,
  needsReauthentication,
  normalizeReauthCode,
} from '../reauth';

describe('needsReauthentication', () => {
  it('Supabase 가 reauthentication_needed 코드로 거절하면 참', () => {
    expect(
      needsReauthentication({
        code: 'reauthentication_needed',
        message: 'Password update requires reauthentication',
      })
    ).toBe(true);
  });
  it('코드가 없어도 메시지로 알아본다', () => {
    expect(needsReauthentication({ message: 'Password update requires reauthentication' })).toBe(
      true
    );
  });
  it('다른 오류·없음은 거짓', () => {
    expect(needsReauthentication(null)).toBe(false);
    expect(needsReauthentication({ code: 'same_password', message: 'New password should…' })).toBe(
      false
    );
  });
});

describe('isReauthenticationCodeInvalid', () => {
  it('reauthentication_not_valid 코드 또는 nonce 메시지면 참', () => {
    expect(isReauthenticationCodeInvalid({ code: 'reauthentication_not_valid' })).toBe(true);
    expect(isReauthenticationCodeInvalid({ message: 'Invalid nonce' })).toBe(true);
  });
  it('그 외는 거짓', () => {
    expect(isReauthenticationCodeInvalid({ code: 'weak_password' })).toBe(false);
    expect(isReauthenticationCodeInvalid(undefined)).toBe(false);
  });
});

describe('normalizeReauthCode', () => {
  it('공백·구분자를 걷어내고 숫자 6자리만 남긴다', () => {
    expect(normalizeReauthCode(' 123 456 ')).toBe('123456');
    expect(normalizeReauthCode('12-34-56')).toBe('123456');
    expect(normalizeReauthCode('1234567')).toBe('123456');
    expect(normalizeReauthCode('abc')).toBe('');
  });
});
