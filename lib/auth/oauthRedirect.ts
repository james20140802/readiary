import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';

const DEFAULT_REDIRECT = '/protected/dashboard';

/**
 * OAuth(Google) 로그인 뒤 돌아올 주소. Supabase가 여기에 `?code=`를 붙여 보내면
 * 서버 착지(/auth/confirm)가 세션으로 바꾸고, `next`(같은 오리진 경로만)로 보낸다.
 * 기본 목적지면 `next`를 싣지 않아 주소를 짧게 유지한다.
 */
export function buildOAuthRedirectTo(origin: string, redirectParam: string | null): string {
  const next = sanitizeRedirectPath(redirectParam);
  const url = new URL('/auth/confirm', origin);
  if (next !== DEFAULT_REDIRECT) url.searchParams.set('next', next);
  return url.toString();
}

/** 로그인·가입 화면의 Google 버튼 표시 여부 — 대시보드에서 제공자를 켜기 전엔 감춰 둔다 */
export function isGoogleLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true';
}
