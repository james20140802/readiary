import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';

const DEFAULT_REDIRECT = '/protected/dashboard';

/** 가입 화면에서 동의를 마치고 Google로 떠났다는 표시 — 서버 착지가 메타데이터에 옮겨 적는다 */
export const OAUTH_CONSENT_PARAM = 'consent';

interface OAuthRedirectOptions {
  /** 약관·개인정보 동의를 이미 받았는가 — 로그인 화면에서는 받지 않으므로 false */
  consented?: boolean;
}

/**
 * OAuth(Google) 로그인 뒤 돌아올 주소. Supabase가 여기에 `?code=`를 붙여 보내면
 * 서버 착지(/auth/confirm)가 세션으로 바꾸고, `next`(같은 오리진 경로만)로 보낸다.
 * 기본 목적지면 `next`를 싣지 않아 주소를 짧게 유지한다.
 */
export function buildOAuthRedirectTo(
  origin: string,
  redirectParam: string | null,
  { consented = false }: OAuthRedirectOptions = {}
): string {
  const next = sanitizeRedirectPath(redirectParam);
  const url = new URL('/auth/confirm', origin);
  if (next !== DEFAULT_REDIRECT) url.searchParams.set('next', next);
  if (consented) url.searchParams.set(OAUTH_CONSENT_PARAM, '1');
  return url.toString();
}

/** 로그인·가입 화면의 Google 버튼 표시 여부 — 대시보드에서 제공자를 켜기 전엔 감춰 둔다 */
export function isGoogleLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true';
}
