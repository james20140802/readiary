import { DEFAULT_REDIRECT_PATH, sanitizeRedirectPath } from './safeRedirect';

/**
 * 이메일 링크의 착지 주소(`{{ .RedirectTo }}`). 환경 변수가 비어 있으면 Site URL(대시보드 설정)로 가 버려
 * 화면에 못 닿으므로 현재 오리진으로 폴백한다.
 *
 * 복귀 경로(초대 등)는 `?next=`로 싣는다 — 가입은 user_metadata.pending_redirect 에도 넣지만, 로그인의
 * "인증 메일 다시 보내기"(`auth.resend`)는 메타데이터를 못 건드리므로 이 값이 유일한 통로다.
 * 옛 `{{ .ConfirmationURL }}` 템플릿은 검증 뒤 이 주소로 돌아오고, 새 token_hash 템플릿은
 * `&next={{ .RedirectTo }}`로 실어 보내 서버 착지(`/auth/confirm`)가 같은 오리진일 때 경로로 푼다.
 */
export function emailConfirmRedirectTo(
  origin: string,
  redirectParam: string | null = null
): string {
  const base = process.env.NEXT_PUBLIC_EMAIL_REDIRECT_TO || `${origin}/auth/confirm`;
  const next = sanitizeRedirectPath(redirectParam);
  if (next === DEFAULT_REDIRECT_PATH) return base;
  const url = new URL(base);
  url.searchParams.set('next', next);
  return url.toString();
}

export function passwordResetRedirectTo(origin: string): string {
  return process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_TO || `${origin}/update-password`;
}
