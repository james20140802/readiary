import defaultCache from 'next-pwa/cache';
import type { RuntimeCaching } from 'next-pwa';

/**
 * PWA 런타임 캐시 규칙 — 개인정보가 담긴 응답은 기기에 남기지 않는다.
 *
 * next-pwa 기본 규칙은 같은 오리진의 모든 페이지·/api 응답과 다른 오리진(Supabase REST·Storage) 응답까지
 * NetworkFirst 로 Cache Storage 에 하루 남긴다. 그러면 로그인한 뒤 본 프로필·책·기록 화면이 로그아웃한 뒤에도
 * 기기에 남아 개인정보처리방침 제7조 3항(캐시에 개인정보를 담지 않는다)과 어긋난다.
 * 그래서 로그인해야 보이는 경로와 Supabase 응답을 NetworkOnly 로 잡는 규칙을 기본 규칙보다 앞에 둔다.
 * 로그인 상태면 보호 화면으로 리다이렉트되는 공개 경로(/·/login·/signup)도 같이 잡는다 — Workbox 는 원래 URL 로
 * 규칙을 고르고 리다이렉트를 따라간 응답(개인화된 대시보드)을 그 공개 URL 아래 캐시하기 때문이다.
 * next-pwa 가 시작 URL(/)에 스스로 끼워 넣는 'start-url' NetworkFirst 규칙은 이 목록보다 앞에 서므로
 * next.config.ts 에서 cacheStartUrl·dynamicStartUrl 을 꺼 둔다(테스트로는 잡히지 않는 층).
 *
 * 규칙은 서비스 워커 파일(sw.js)로 문자열 복사된다 — 바깥 변수를 참조하는 함수는 깨지므로 RegExp 만 쓴다.
 */

/** 로그인해야 보이거나 남의 기록·프로필이 담기는 경로의 첫 세그먼트 */
export const PRIVATE_PATH_SEGMENTS = [
  'protected',
  'api',
  'auth',
  'onboarding',
  'invite',
  'logout',
  'share',
] as const;

/** 같은 오리진의 비공개 경로 — 페이지 HTML·RSC 페이로드(?_rsc=)·/api 응답 모두 */
export const PRIVATE_PATH_PATTERN = new RegExp(
  `^[a-z]+://[^/]+/(?:${PRIVATE_PATH_SEGMENTS.join('|')})(?:[/?#]|$)`
);

/** proxy.ts 가 로그인 상태면 보호 화면으로 보내는 공개 경로의 첫 세그먼트 — 루트(/)는 패턴에서 따로 잡는다 */
export const AUTH_REDIRECT_PATH_SEGMENTS = ['login', 'signup'] as const;

/**
 * 로그인 상태에서 보호 화면으로 리다이렉트되는 공개 경로 — 루트·/login·/signup 과 그 RSC 페이로드.
 * 리다이렉트를 따라간 개인화 응답이 이 URL 아래 캐시되지 않도록 NetworkOnly 로 둔다(오프라인 랜딩은 포기).
 */
export const AUTH_REDIRECT_PATH_PATTERN = new RegExp(
  `^[a-z]+://[^/]+/(?:(?:${AUTH_REDIRECT_PATH_SEGMENTS.join('|')})(?:[/?#]|$)|(?:[?#]|$))`
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Supabase 오리진(REST·Auth·Storage) — 환경 변수가 없으면 supabase.co 기본 도메인으로 */
export function supabaseOriginPattern(supabaseUrl: string | undefined): RegExp {
  const origin = safeOrigin(supabaseUrl);
  return origin ? new RegExp(`^${escapeRegExp(origin)}/`) : /^https:\/\/[^/]+\.supabase\.co\//;
}

/** next/image 로 프록시한 Supabase 이미지(프로필 사진) — url 쿼리에 Supabase 호스트가 들어 있다 */
export function supabaseImagePattern(supabaseUrl: string | undefined): RegExp {
  const origin = safeOrigin(supabaseUrl);
  const host = origin ? escapeRegExp(new URL(origin).host) : '[^&]*\\.supabase\\.co';
  return new RegExp(`/_next/image\\?url=[^&]*${host}`);
}

function safeOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** 개인정보가 담길 수 있는 응답은 네트워크로만 — 기본 규칙(NetworkFirst)보다 먼저 매칭돼야 한다 */
export function privateRuntimeCaching(supabaseUrl: string | undefined): RuntimeCaching[] {
  return [
    { urlPattern: PRIVATE_PATH_PATTERN, handler: 'NetworkOnly', options: {} },
    { urlPattern: AUTH_REDIRECT_PATH_PATTERN, handler: 'NetworkOnly', options: {} },
    { urlPattern: supabaseOriginPattern(supabaseUrl), handler: 'NetworkOnly', options: {} },
    { urlPattern: supabaseImagePattern(supabaseUrl), handler: 'NetworkOnly', options: {} },
  ];
}

export function buildRuntimeCaching(supabaseUrl: string | undefined): RuntimeCaching[] {
  return [...privateRuntimeCaching(supabaseUrl), ...defaultCache];
}
