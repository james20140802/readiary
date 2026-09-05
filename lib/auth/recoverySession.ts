/**
 * 비밀번호 재설정 링크로 만들어진 세션인지 — Supabase JWT의 `amr`(인증 수단 이력)에
 * `recovery`가 있으면 그렇다. 일반 로그인 세션(`password`·`oauth`)으로 새 비밀번호 화면을
 * 열면 현재 비밀번호 확인 없이 바꿀 수 있어서, 그 화면은 이 세션에만 열어 준다.
 *
 * amr은 세션에 붙어 다니므로 토큰이 갱신돼도 남는다(가장 최근 수단이 앞에 온다).
 */
export interface AmrEntry {
  method?: string;
  timestamp?: number;
}

export function hasRecoveryMethod(claims: unknown): boolean {
  if (!claims || typeof claims !== 'object') return false;
  const amr = (claims as { amr?: unknown }).amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: AmrEntry | null) => !!entry && entry.method === 'recovery');
}
