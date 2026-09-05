/**
 * 이메일 링크의 착지 주소. 환경 변수가 비어 있으면 Site URL(대시보드 설정)로 가 버려 화면에 못 닿으므로
 * 현재 오리진으로 폴백한다. 템플릿이 token_hash 방식이면 이 값은 쓰이지 않고 서버 착지가 받는다.
 */
export function emailConfirmRedirectTo(origin: string): string {
  return process.env.NEXT_PUBLIC_EMAIL_REDIRECT_TO || `${origin}/auth/confirm`;
}

export function passwordResetRedirectTo(origin: string): string {
  return process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_TO || `${origin}/update-password`;
}
