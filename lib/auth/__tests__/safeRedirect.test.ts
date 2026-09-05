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

describe('sanitizeRedirectPath — 제어문자 변종 (WHATWG 파서가 탭·개행을 지워 //evil 로 바꾼다)', () => {
  const TAB = String.fromCharCode(9);
  const LF = String.fromCharCode(10);
  const CR = String.fromCharCode(13);
  const NUL = String.fromCharCode(0);

  it('탭·LF·CR 이 끼어든 경로는 기본 경로', () => {
    expect(sanitizeRedirectPath(`/${TAB}/evil.test/x`)).toBe('/protected/dashboard');
    expect(sanitizeRedirectPath(`/${LF}/evil.test/x`)).toBe('/protected/dashboard');
    expect(sanitizeRedirectPath(`/${CR}/evil.test/x`)).toBe('/protected/dashboard');
  });

  it('제어문자가 어디에 있어도 기본 경로 — 파서마다 다르게 다루므로 통째로 거절', () => {
    expect(sanitizeRedirectPath(`/invite/gil${TAB}dong-1234`)).toBe('/protected/dashboard');
    expect(sanitizeRedirectPath(`/invite/x${NUL}`)).toBe('/protected/dashboard');
  });

  it('파싱했을 때 다른 오리진으로 풀리는 값은 기본 경로', () => {
    expect(sanitizeRedirectPath('/\\\\evil.test')).toBe('/protected/dashboard');
    expect(sanitizeRedirectPath('//evil.test/x')).toBe('/protected/dashboard');
  });

  it('공백·한글·쿼리가 든 정상 경로는 그대로', () => {
    expect(sanitizeRedirectPath('/protected/social?invite=gildong-1234')).toBe(
      '/protected/social?invite=gildong-1234'
    );
    expect(sanitizeRedirectPath('/invite/길동-1234')).toBe('/invite/길동-1234');
    expect(sanitizeRedirectPath('/invite/a b')).toBe('/invite/a b');
  });
});
