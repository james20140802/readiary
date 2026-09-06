import { describe, expect, it } from 'vitest';
import {
  AUTH_REDIRECT_PATH_PATTERN,
  PRIVATE_PATH_PATTERN,
  buildRuntimeCaching,
  privateRuntimeCaching,
  supabaseImagePattern,
  supabaseOriginPattern,
} from '@/lib/pwa/runtime-caching';

const ORIGIN = 'https://www.readiary.net';

describe('PRIVATE_PATH_PATTERN', () => {
  it.each([
    '/protected/dashboard',
    '/protected/books/abc?_rsc=1a2b',
    '/protected',
    '/api/notifications/read',
    '/auth/callback?code=x',
    '/onboarding',
    '/invite/name-1234',
    '/logout',
    '/share/e/xyz',
  ])('로그인 뒤 화면과 남의 기록이 담기는 경로를 잡는다: %s', (path) => {
    expect(PRIVATE_PATH_PATTERN.test(`${ORIGIN}${path}`)).toBe(true);
  });

  it.each(['/', '/login', '/signup', '/terms', '/privacy', '/protectedx', '/_next/static/a.js'])(
    '공개 화면과 정적 자원은 이 패턴이 잡지 않는다: %s',
    (path) => {
      expect(PRIVATE_PATH_PATTERN.test(`${ORIGIN}${path}`)).toBe(false);
    }
  );
});

describe('AUTH_REDIRECT_PATH_PATTERN', () => {
  it.each([
    '/',
    '/?_rsc=1a2b',
    '/#top',
    '/login',
    '/login?redirect=%2Fprotected%2Fdashboard',
    '/login/',
    '/signup',
    '/signup?_rsc=1a2b',
  ])('로그인 상태면 보호 화면으로 리다이렉트되는 공개 경로를 잡는다: %s', (path) => {
    expect(AUTH_REDIRECT_PATH_PATTERN.test(`${ORIGIN}${path}`)).toBe(true);
  });

  it.each([
    '/terms',
    '/privacy',
    '/loginx',
    '/reset-password',
    '/_next/static/a.js',
    '/icons/a.png',
  ])('리다이렉트 없는 공개 화면과 정적 자원은 두어 오프라인에서 열리게 한다: %s', (path) => {
    expect(AUTH_REDIRECT_PATH_PATTERN.test(`${ORIGIN}${path}`)).toBe(false);
  });
});

describe('supabaseOriginPattern', () => {
  it('환경 변수의 오리진만 잡는다', () => {
    const pattern = supabaseOriginPattern('https://abc.supabase.co');
    expect(pattern.test('https://abc.supabase.co/rest/v1/entries?select=*')).toBe(true);
    expect(pattern.test('https://abc.supabase.co/storage/v1/object/public/avatars/1.png')).toBe(
      true
    );
    expect(pattern.test('https://search1.kakaocdn.net/cover.jpg')).toBe(false);
    expect(pattern.test('https://abc.supabase.co.evil.example/')).toBe(false);
  });

  it('환경 변수가 없거나 깨졌으면 supabase.co 기본 도메인으로 물러선다', () => {
    for (const url of [undefined, 'not a url']) {
      const pattern = supabaseOriginPattern(url);
      expect(pattern.test('https://abc.supabase.co/rest/v1/x')).toBe(true);
      expect(pattern.test('https://www.readiary.net/')).toBe(false);
    }
  });
});

describe('supabaseImagePattern', () => {
  it('next/image 로 프록시한 Supabase 이미지를 잡고 책 표지는 두어 둔다', () => {
    const pattern = supabaseImagePattern('https://abc.supabase.co');
    const avatar = encodeURIComponent('https://abc.supabase.co/storage/v1/object/public/a.png');
    const cover = encodeURIComponent('https://search1.kakaocdn.net/cover.jpg');
    expect(pattern.test(`${ORIGIN}/_next/image?url=${avatar}&w=96&q=75`)).toBe(true);
    expect(pattern.test(`${ORIGIN}/_next/image?url=${cover}&w=96&q=75`)).toBe(false);
  });
});

describe('buildRuntimeCaching', () => {
  it('sw.js 로 복사할 수 있게 규칙은 RegExp 만 쓰고 options 를 늘 갖는다', () => {
    for (const rule of privateRuntimeCaching('https://abc.supabase.co')) {
      expect(rule.urlPattern).toBeInstanceOf(RegExp);
      expect(rule.handler).toBe('NetworkOnly');
      expect(rule.options).toBeDefined();
    }
  });

  it('비공개 규칙이 next-pwa 기본 규칙보다 앞에 온다', () => {
    const rules = buildRuntimeCaching('https://abc.supabase.co');
    const privateCount = privateRuntimeCaching('https://abc.supabase.co').length;
    expect(rules.slice(0, privateCount).every((r) => r.handler === 'NetworkOnly')).toBe(true);
    expect(rules.length).toBeGreaterThan(privateCount);
    expect(rules.slice(privateCount).some((r) => r.options.cacheName === 'others')).toBe(true);
  });
});
