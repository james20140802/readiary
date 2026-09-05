import { describe, expect, it } from 'vitest';
import {
  describeAuthError,
  isEmailNotConfirmed,
  validateEmail,
  validateNewPassword,
} from '../authErrors';

describe('describeAuthError', () => {
  it('아는 문구는 흐름별 한국어로 옮긴다', () => {
    expect(describeAuthError('login', 'Invalid login credentials')).toBe(
      '이메일 또는 비밀번호가 일치하지 않습니다.'
    );
    expect(describeAuthError('signup', 'User already registered')).toBe(
      '이미 가입된 이메일입니다.'
    );
    expect(
      describeAuthError('updatePassword', 'New password should be different from the old password.')
    ).toBe('새 비밀번호는 기존 비밀번호와 달라야 합니다.');
  });

  it('레이트리밋 문구는 흐름과 무관하게 같은 안내로', () => {
    expect(describeAuthError('login', 'Request rate limit reached')).toMatch(/잦습니다/);
    expect(describeAuthError('reset', 'email rate limit exceeded')).toMatch(/잦습니다/);
    expect(describeAuthError('signup', 'over_email_send_rate_limit')).toMatch(/잦습니다/);
  });

  it('모르는 문구·빈 문구는 흐름별 기본 문구로 — 서버 문구를 그대로 보여주지 않는다', () => {
    expect(describeAuthError('login', 'Database error saving new user')).toBe(
      '로그인 중 오류가 발생했습니다.'
    );
    expect(describeAuthError('reset', undefined)).toMatch(/보내지 못했습니다/);
    expect(describeAuthError('signup', null)).toBe('회원가입 중 오류가 발생했습니다.');
  });
});

describe('isEmailNotConfirmed', () => {
  it('정확히 그 문구일 때만 참', () => {
    expect(isEmailNotConfirmed('Email not confirmed')).toBe(true);
    expect(isEmailNotConfirmed('Invalid login credentials')).toBe(false);
    expect(isEmailNotConfirmed(undefined)).toBe(false);
  });
});

describe('validateEmail', () => {
  it('비면 입력 안내, 형식이 틀리면 형식 안내, 맞으면 null', () => {
    expect(validateEmail('   ')).toBe('이메일을 입력해주세요.');
    expect(validateEmail('nope')).toBe('이메일 형식을 확인해주세요.');
    expect(validateEmail('a@b')).toBe('이메일 형식을 확인해주세요.');
    expect(validateEmail(' me@example.com ')).toBeNull();
  });
});

describe('validateNewPassword', () => {
  it('6자 미만·불일치를 거르고, 통과하면 null', () => {
    expect(validateNewPassword('abc', 'abc')).toBe('비밀번호는 최소 6자 이상이어야 합니다.');
    expect(validateNewPassword('abcdef', 'abcdeg')).toBe('비밀번호가 일치하지 않습니다.');
    expect(validateNewPassword('abcdef', 'abcdef')).toBeNull();
  });
});
