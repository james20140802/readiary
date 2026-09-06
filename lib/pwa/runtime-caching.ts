import defaultCache from 'next-pwa/cache';
import type { RuntimeCaching } from 'next-pwa';

/**
 * PWA 런타임 캐시 규칙 — 개인정보가 담긴 응답은 기기에 남기지 않는다.
 *
 * next-pwa 기본 규칙은 같은 오리진의 모든 페이지·/api 응답과 다른 오리진(Supabase REST·Storage) 응답까지
 * NetworkFirst 로 Cache Storage 에 하루 남긴다. 그런데 루트 레이아웃(app/layout.tsx)이 모든 화면에 로그인 상태와
 * 미읽음 알림 수를 실어 보내므로, /terms 같은 공개 화면의 HTML 도 로그인한 사람에게는 개인화된 응답이다.
 * 경로를 골라 막으면 새 경로가 생길 때마다 구멍이 나므로, 응답의 종류로 막는다 — 같은 오리진의 문서(HTML)·RSC
 * 페이로드·/api·/auth 응답은 전부 NetworkOnly, 캐시하는 것은 글꼴·아이콘·스크립트·스타일·이미지 같은 화면 파일뿐이다
 * (개인정보처리방침 제7조 3항). Supabase 응답과 next/image 로 프록시한 Supabase 이미지(프로필 사진)도 NetworkOnly.
 *
 * next-pwa 가 시작 URL(/)에 스스로 끼워 넣는 'start-url' NetworkFirst 규칙은 이 목록보다 앞에 서므로
 * next.config.ts 에서 cacheStartUrl·dynamicStartUrl 을 꺼 둔다(테스트로는 잡히지 않는 층).
 *
 * 규칙은 서비스 워커 파일(sw.js)로 문자열 복사된다 — 함수는 바깥 변수를 참조하면 깨지므로 안에서 닫혀 있어야 한다.
 */

/** Workbox 가 매칭 함수에 넘기는 값 중 여기서 쓰는 부분 */
export interface MatchContext {
  url: URL;
  request: Pick<Request, 'mode' | 'destination' | 'headers'>;
  sameOrigin: boolean;
}

/**
 * 같은 오리진에서 개인화될 수 있는 응답 — 문서 내비게이션, RSC 페이로드(RSC 헤더 또는 ?_rsc=), /api·/auth,
 * 그리고 확장자 없는 경로(페이지·리다이렉트·라우트 핸들러). /_next/ 아래 정적 청크와 이미지 프록시는 제외한다.
 * sw.js 로 문자열 복사되므로 이 함수는 바깥 변수를 하나도 참조하지 않는다.
 */
export function isPersonalizedSameOriginRequest(context: MatchContext): boolean {
  const { url, request, sameOrigin } = context;
  if (!sameOrigin) return false;
  if (request.mode === 'navigate' || request.destination === 'document') return true;
  if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return true;
  const pathname = url.pathname;
  if (pathname.startsWith('/_next/data/')) return true;
  if (pathname.startsWith('/_next/')) return false;
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) return true;
  return !/\.[A-Za-z0-9]+$/.test(pathname);
}

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
    { urlPattern: isPersonalizedSameOriginRequest, handler: 'NetworkOnly', options: {} },
    { urlPattern: supabaseOriginPattern(supabaseUrl), handler: 'NetworkOnly', options: {} },
    { urlPattern: supabaseImagePattern(supabaseUrl), handler: 'NetworkOnly', options: {} },
  ];
}

export function buildRuntimeCaching(supabaseUrl: string | undefined): RuntimeCaching[] {
  return [...privateRuntimeCaching(supabaseUrl), ...defaultCache];
}
