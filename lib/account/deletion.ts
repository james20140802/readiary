import { ACCOUNT_DELETION_EFFECTIVE_AT } from '@/lib/legal/texts';

/** 탈퇴를 신청하면 이 기간 안에는 되돌릴 수 있고, 지나면 기록이 지워진다 */
export const ACCOUNT_DELETION_GRACE_DAYS = 14;

/** 소셜 로그인 계정은 탈퇴 직전 이 시간 안에 다시 로그인했어야 본인으로 본다 */
export const OAUTH_REAUTH_WINDOW_SECONDS = 600;

/** 서버가 찍은 timestamp가 이 기기 시계보다 조금 앞서도 거절하지 않는다 */
const CLOCK_SKEW_SECONDS = 5 * 60;

/** 시행일 전에는 탈퇴 신청을 열지 않는다 */
export function isAccountDeletionOpen(now: Date = new Date()): boolean {
  return now.getTime() >= Date.parse(ACCOUNT_DELETION_EFFECTIVE_AT);
}

/** 삭제 예정일을 한국 시간 기준 "11월 26일" 꼴로 보여 준다 */
export function formatPurgeDate(purgeAfter: string | Date): string {
  const date = typeof purgeAfter === 'string' ? new Date(purgeAfter) : purgeAfter;
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${month}월 ${day}일`;
}

/** JWT `amr` 항목 중 가장 늦은 인증 시각이 최근 10분 안인지 — 방금 본인이 로그인했는지 확인한다 */
export function hasRecentSignIn(claims: unknown, nowSeconds: number): boolean {
  if (!claims || typeof claims !== 'object') return false;
  const amr = (claims as { amr?: unknown }).amr;
  if (!Array.isArray(amr)) return false;
  let latest = -Infinity;
  for (const entry of amr) {
    if (!entry || typeof entry !== 'object') continue;
    const ts = (entry as { timestamp?: unknown }).timestamp;
    if (typeof ts !== 'number' || !Number.isFinite(ts)) continue;
    // 기기 시계보다 한참 앞선 값(밀리초 단위 등)은 신선한 로그인으로 치지 않는다
    if (ts - nowSeconds > CLOCK_SKEW_SECONDS) continue;
    if (ts > latest) latest = ts;
  }
  return latest >= nowSeconds - OAUTH_REAUTH_WINDOW_SECONDS;
}

/** 이메일·비밀번호로 가입한 계정인지 */
export function hasPasswordIdentity(user: {
  email?: string | null;
  identities?: { provider: string }[] | null;
}): boolean {
  return !!user.email && (user.identities ?? []).some((i) => i.provider === 'email');
}
