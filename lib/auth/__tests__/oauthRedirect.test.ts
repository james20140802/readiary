import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildOAuthRedirectTo, isGoogleLoginEnabled } from '../oauthRedirect';

describe('buildOAuthRedirectTo', () => {
  it('목적지가 없거나 기본이면 next 없이 /auth/confirm', () => {
    expect(buildOAuthRedirectTo('https://www.readiary.net', null)).toBe(
      'https://www.readiary.net/auth/confirm'
    );
    expect(buildOAuthRedirectTo('https://www.readiary.net', '/protected/dashboard')).toBe(
      'https://www.readiary.net/auth/confirm'
    );
  });

  it('같은 오리진 경로는 next로 싣는다(인코딩 포함)', () => {
    expect(buildOAuthRedirectTo('http://localhost:3000', '/invite/abc?x=1')).toBe(
      'http://localhost:3000/auth/confirm?next=%2Finvite%2Fabc%3Fx%3D1'
    );
  });

  it('외부 주소·프로토콜 상대 경로는 버리고 기본으로', () => {
    expect(buildOAuthRedirectTo('https://www.readiary.net', 'https://evil.test')).toBe(
      'https://www.readiary.net/auth/confirm'
    );
    expect(buildOAuthRedirectTo('https://www.readiary.net', '//evil.test')).toBe(
      'https://www.readiary.net/auth/confirm'
    );
  });

  it('가입 화면에서 동의를 마쳤으면 consent=1 을 싣는다 — 로그인 화면(기본)은 싣지 않는다', () => {
    expect(
      buildOAuthRedirectTo('https://www.readiary.net', '/invite/abc', { consented: true })
    ).toBe('https://www.readiary.net/auth/confirm?next=%2Finvite%2Fabc&consent=1');
    expect(buildOAuthRedirectTo('https://www.readiary.net', null, { consented: true })).toBe(
      'https://www.readiary.net/auth/confirm?consent=1'
    );
    expect(buildOAuthRedirectTo('https://www.readiary.net', null, { consented: false })).toBe(
      'https://www.readiary.net/auth/confirm'
    );
  });
});

describe('isGoogleLoginEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("정확히 'true'일 때만 켜진다", () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED', 'true');
    expect(isGoogleLoginEnabled()).toBe(true);
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED', '1');
    expect(isGoogleLoginEnabled()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED', '');
    expect(isGoogleLoginEnabled()).toBe(false);
  });
});
