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
 * DB에 남은 푸시 주소가 깨지지 않도록 계속 둔다. 위에서부터 먼저 맞는 규칙이 쓰인다(쿼리는 Next가 보존).
 */
export const LEGACY_REDIRECTS = [
  { source: '/protected', destination: '/today', permanent: true },
  { source: '/protected/dashboard/:path*', destination: '/today/:path*', permanent: true },
  { source: '/protected/:path*', destination: '/:path*', permanent: true },
] as const satisfies readonly { source: string; destination: string; permanent: true }[];
