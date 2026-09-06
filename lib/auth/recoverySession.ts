/**
 * 비밀번호 재설정 링크로 만들어진 세션인지 — Supabase JWT의 `amr`(인증 수단 이력)로 판단한다.
 *
 * 링크가 어느 길로 검증됐느냐에 따라 기록되는 수단 이름이 다르다:
 * - 새 템플릿(`token_hash` → 서버 `verifyOtp`): `otp` — 가입 확인·매직링크와 같은 이름
 * - 옛 PKCE 링크(`?code=` 교환): `recovery`
 * - 매직링크: `magiclink`
 * Supabase Auth 자신도 이 셋을 복구 세션으로 본다(`Session.IsRecovery`). 셋 다 "이 이메일의 주인"임을
 * 방금 증명한 세션이라 새 비밀번호 화면을 열어 주되, 항목의 `timestamp`로 최근 것만 받는다 —
 * amr은 세션이 사는 동안(토큰이 갱신돼도) 남으므로, 오래전 이메일 인증이 상시 통행증이 되면 안 된다.
 * 일반 로그인 세션(`password`·`oauth`)은 현재 비밀번호 확인이 있는 프로필 쪽으로 보낸다.
 */
export const RECOVERY_METHODS: readonly string[] = ['recovery', 'otp', 'magiclink'];

/** 링크를 눌러 세션이 선 뒤 이 시간 안에만 새 비밀번호 화면이 열린다 */
export const RECOVERY_WINDOW_SECONDS = 60 * 60;

/** 서버가 찍은 timestamp가 이 기기 시계보다 조금 앞서도 거절하지 않는다 */
const CLOCK_SKEW_SECONDS = 5 * 60;

export interface AmrEntry {
  method?: string;
  timestamp?: number;
}

export function hasRecoveryMethod(
  claims: unknown,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!claims || typeof claims !== 'object') return false;
  const amr = (claims as { amr?: unknown }).amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: AmrEntry | null) => {
    if (!entry || typeof entry !== 'object') return false;
    if (typeof entry.method !== 'string' || !RECOVERY_METHODS.includes(entry.method)) return false;
    if (typeof entry.timestamp !== 'number' || !Number.isFinite(entry.timestamp)) return false;
    const age = nowSeconds - entry.timestamp;
    return age >= -CLOCK_SKEW_SECONDS && age <= RECOVERY_WINDOW_SECONDS;
  });
}
