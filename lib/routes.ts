/** 로그인한 사람의 앱 화면 주소 — proxy 로그인 검사, 기본 착지, 옛 주소 이동이 모두 이 파일을 따른다. */

export const HOME_PATH = '/today';

/** 로그인이 필요한 화면의 첫 마디. 새 화면을 만들면 여기와 proxy.ts의 matcher에 함께 더한다. */
export const APP_ROUTE_PREFIXES = [
  '/today',
  '/books',
  '/entry',
  '/profile',
  '/settings',
  '/social',
  '/search',
  '/notifications',
  '/pilsa',
] as const;

/** `/books`와 `/books/…`는 앱 화면, `/bookstore` 같은 우연한 접두사는 아니다 */
export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * 2026-10 이전 주소(/protected/…) → 새 주소. 설치된 PWA의 시작 주소, 보낸 알림·이메일 링크, 북마크,
 * DB에 남은 푸시 주소가 깨지지 않도록 계속 둔다. 쿼리는 Next가 보존한다.
 * 규칙끼리 겹치지 않게 쓴다 — Vercel 배포에서는 규칙 순서가 지켜지지 않아, 겹치면 `/protected/dashboard`가
 * `/dashboard`로 가는 것이 미리보기에서 확인됐다(로컬 next start에서는 순서대로 동작).
 */
export const LEGACY_REDIRECTS = [
  { source: '/protected', destination: '/today', permanent: true },
  { source: '/protected/dashboard/:path*', destination: '/today/:path*', permanent: true },
  // 한 마디 이상이고 dashboard가 아닌 것만 — 위 두 규칙과 겹치지 않는다
  { source: '/protected/:path((?!dashboard(?:/|$)).+)', destination: '/:path', permanent: true },
] as const satisfies readonly { source: string; destination: string; permanent: true }[];
