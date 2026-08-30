import { describe, expect, it } from 'vitest';
import { sanitizeRedirectPath } from '../safeRedirect';

describe('sanitizeRedirectPath', () => {
  it('null이면 기본 경로', () => {
    expect(sanitizeRedirectPath(null)).toBe('/protected/dashboard');
  });
  it('같은 오리진의 절대 경로는 그대로 반환', () => {
    expect(sanitizeRedirectPath('/protected/social?invite=x')).toBe('/protected/social?invite=x');
  });
  it('//로 시작하면 기본 경로 (프로토콜 상대 URL 방지)', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe('/protected/dashboard');
  });
  it('백슬래시가 있으면 기본 경로 (WHATWG 파서 //evil.com 변종 방지)', () => {
    expect(sanitizeRedirectPath('/\\evil.com')).toBe('/protected/dashboard');
  });
  it('백슬래시로 시작하는 변종도 기본 경로', () => {
    expect(sanitizeRedirectPath('\\/evil.com')).toBe('/protected/dashboard');
  });
  it('절대 URL은 기본 경로', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe('/protected/dashboard');
  });
  it('빈 문자열이면 기본 경로', () => {
    expect(sanitizeRedirectPath('')).toBe('/protected/dashboard');
  });
});
