/** 화면이 앉는 틀 — 일기장 괘선과 내비 구성을 정한다 */
export type Frame = 'leaves' | 'feed' | 'plain' | 'bare' | 'landing';

/** 내비 없이 괘선만 깔리는 화면(인증 절차·공개 링크·약관) */
const BARE_PREFIXES = [
  '/login',
  '/signup',
  '/onboarding',
  '/auth',
  '/reset-password',
  '/update-password',
  '/share',
  '/invite',
  '/privacy',
  '/terms',
  '/email',
] as const;

/** 간지(여백선) 틀을 쓰는 화면 — 화면별 PR이 하나씩 추가한다 */
export const LEAVES_ROUTES: readonly string[] = ['/profile', '/today'];

/**
 * 하위 주소는 다른 틀을 쓰므로 주소 하나만 정확히 맞추는 간지 화면 — 책장(/books)과 책 한 권(/books/[id]).
 * 책 등록(/books/new)과 책 아래 주소(발췌집·기록 남기기)는 여기에 들지 않는다.
 */
export const LEAVES_EXACT: readonly RegExp[] = [/^\/books$/, /^\/books\/(?!new$)[^/]+$/];

/** 같은 경로이거나 `접두사/…`일 때만 맞는다 (`/sharing`은 `/share`가 아니다) */
function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function frameFor(pathname: string): Frame {
  if (pathname === '/') return 'landing';
  if (BARE_PREFIXES.some((p) => matches(pathname, p))) return 'bare';
  if (/^\/entry\/[^/]+$/.test(pathname) || /^\/social\/u\/[^/]+\/entry\/[^/]+$/.test(pathname))
    return 'leaves';
  if (LEAVES_ROUTES.some((p) => matches(pathname, p))) return 'leaves';
  if (LEAVES_EXACT.some((re) => re.test(pathname))) return 'leaves';
  return 'plain';
}

/** 틀마다 깔 괘선 — 랜딩은 자체 종이를 쓰므로 없다 */
export function ruledFor(frame: Frame): 'margin' | 'plain' | null {
  if (frame === 'leaves' || frame === 'feed') return 'margin';
  if (frame === 'landing') return null;
  return 'plain';
}

export type TabKey = 'today' | 'books' | 'social' | 'me' | 'search' | 'bell';

/** 메뉴에 나열되는 탭 (검색·알림은 상단 아이콘이라 제외) */
export const NAV_TABS: readonly {
  key: 'today' | 'books' | 'social' | 'me';
  href: string;
  label: string;
}[] = [
  { key: 'today', href: '/today', label: '오늘' },
  { key: 'books', href: '/books', label: '책장' },
  { key: 'social', href: '/social', label: '소셜' },
  { key: 'me', href: '/profile', label: '나' },
];

/** 지금 화면이 어느 탭에 속하는지 — 알림이 소셜보다 먼저 판정된다 */
export function tabFor(pathname: string): TabKey | null {
  if (matches(pathname, '/social/notifications') || matches(pathname, '/notifications'))
    return 'bell';
  if (matches(pathname, '/today') || matches(pathname, '/entry') || matches(pathname, '/pilsa'))
    return 'today';
  if (matches(pathname, '/books')) return 'books';
  if (matches(pathname, '/social')) return 'social';
  if (matches(pathname, '/profile') || matches(pathname, '/settings')) return 'me';
  if (matches(pathname, '/search')) return 'search';
  return null;
}

/** 메뉴는 로그인한 앱 화면에서만 보인다 */
export function showsNav(frame: Frame, loggedIn: boolean): boolean {
  if (frame === 'bare' || frame === 'landing') return false;
  return loggedIn;
}
