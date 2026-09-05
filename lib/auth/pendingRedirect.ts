import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';

/**
 * 가입 → 이메일 인증 → 온보딩을 지나도 살아남아야 하는 복귀 경로(초대 링크 등)를 담는
 * Supabase user_metadata 키.
 *
 * 쿼리 파라미터는 이메일 인증에서 끊기고(템플릿·리다이렉트 허용 목록에 의존), 쿠키는 가입한
 * 기기에서만 살아남는다. 메타데이터는 계정에 붙어 다니므로 데스크톱에서 가입하고 휴대폰에서
 * 메일을 열어도 온보딩 끝에서 꺼내 쓸 수 있다.
 */
export const PENDING_REDIRECT_KEY = 'pending_redirect';

/** 가입 때 메타데이터에 실을 값 — 검증(같은 오리진 절대 경로)을 통과한 것만 싣는다 */
export function toPendingRedirect(param: string | null): string | null {
  if (!param) return null;
  return sanitizeRedirectPath(param) === param ? param : null;
}

/**
 * user_metadata에서 복귀 경로를 읽는다. 메타데이터는 사용자가 클라이언트에서 고칠 수 있는 값이라
 * 저장 때와 똑같이 다시 검증하고, 문자열이 아니면 버린다.
 */
export function readPendingRedirect(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[PENDING_REDIRECT_KEY];
  if (typeof value !== 'string') return null;
  return toPendingRedirect(value);
}
