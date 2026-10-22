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
export const LEAVES_ROUTES: readonly string[] = [];

/** 같은 경로이거나 `접두사/…`일 때만 맞는다 (`/sharing`은 `/share`가 아니다) */
function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function frameFor(pathname: string): Frame {
  if (pathname === '/') return 'landing';
  if (BARE_PREFIXES.some((p) => matches(pathname, p))) return 'bare';
  if (LEAVES_ROUTES.some((p) => matches(pathname, p))) return 'leaves';
  return 'plain';
}

/** 틀마다 깔 괘선 — 랜딩은 자체 종이를 쓰므로 없다 */
export function ruledFor(frame: Frame): 'margin' | 'plain' | null {
  if (frame === 'leaves' || frame === 'feed') return 'margin';
  if (frame === 'landing') return null;
  return 'plain';
}
