import { describe, expect, it } from 'vitest';
import {
  type MatchContext,
  buildRuntimeCaching,
  isPersonalizedSameOriginRequest,
  privateRuntimeCaching,
  supabaseImagePattern,
  supabaseOriginPattern,
} from '@/lib/pwa/runtime-caching';

const ORIGIN = 'https://www.readiary.net';

/** 서비스 워커의 fetch 이벤트가 넘기는 값을 흉내 낸다 — Node 의 Request 는 mode:'navigate' 를 만들 수 없다 */
function context(
  path: string,
  init: {
    mode?: RequestMode;
    destination?: RequestDestination;
    headers?: Record<string, string>;
  } = {},
  origin = ORIGIN
): MatchContext {
  const url = new URL(path, origin);
  return {
    url,
    sameOrigin: url.origin === ORIGIN,
    request: {
      mode: init.mode ?? 'cors',
      destination: init.destination ?? '',
      headers: new Headers(init.headers ?? {}),
    },
  };
}

describe('isPersonalizedSameOriginRequest', () => {
  it.each([
    '/',
    '/terms',
    '/privacy',
    '/login',
    '/reset-password',
    '/protected/dashboard',
    '/share/e/x',
  ])(
    '문서 내비게이션은 공개 화면이라도 잡는다 — 루트 레이아웃이 로그인 상태를 싣는다: %s',
    (path) => {
      expect(
        isPersonalizedSameOriginRequest(
          context(path, { mode: 'navigate', destination: 'document' })
        )
      ).toBe(true);
    }
  );

  it('RSC 페이로드는 헤더로도 쿼리로도 잡는다', () => {
    expect(isPersonalizedSameOriginRequest(context('/terms', { headers: { RSC: '1' } }))).toBe(
      true
    );
    expect(isPersonalizedSameOriginRequest(context('/protected/books/abc?_rsc=1a2b'))).toBe(true);
  });

  it.each([
    '/api/notifications/read',
    '/api',
    '/auth/callback?code=x',
    '/logout',
    '/invite/name-1234',
  ])('fetch 로 받는 /api·/auth·확장자 없는 경로도 잡는다: %s', (path) => {
    expect(isPersonalizedSameOriginRequest(context(path))).toBe(true);
  });

  it.each([
    '/_next/static/chunks/a.js',
    '/_next/image?url=https%3A%2F%2Fsearch1.kakaocdn.net%2Fcover.jpg&w=96&q=75',
    '/icons/icon-192x192-v2.png',
    '/manifest.json',
    '/fonts/MaruBuri-Regular.woff',
    '/sw.js',
  ])('정적 화면 파일은 두어 오프라인에서 열리게 한다: %s', (path) => {
    expect(isPersonalizedSameOriginRequest(context(path))).toBe(false);
  });

  it('다른 오리진은 이 규칙이 잡지 않는다(Supabase 는 뒤 규칙이 잡는다)', () => {
    expect(
      isPersonalizedSameOriginRequest(
        context('https://abc.supabase.co/rest/v1/entries', { mode: 'navigate' })
      )
    ).toBe(false);
  });

  it('sw.js 로 문자열 복사돼도 같은 결과를 낸다 — 바깥 변수를 참조하지 않는다', () => {
    const copied = new Function(
      `return (${isPersonalizedSameOriginRequest.toString()})`
    )() as typeof isPersonalizedSameOriginRequest;
    for (const [path, init] of [
      ['/terms', { mode: 'navigate' as const }],
      ['/protected/x?_rsc=1'],
      ['/_next/static/a.js'],
      ['/icons/a.png'],
    ] as const) {
      const ctx = context(path, init);
      expect(copied(ctx)).toBe(isPersonalizedSameOriginRequest(ctx));
    }
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
  it('비공개 규칙은 전부 NetworkOnly 이고 options 를 늘 갖는다', () => {
    const rules = privateRuntimeCaching('https://abc.supabase.co');
    expect(rules[0].urlPattern).toBe(isPersonalizedSameOriginRequest);
    for (const rule of rules) {
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
