/**
 * 비밀번호 변경의 진짜 경계는 Supabase Auth다. 대시보드의 **Secure password change**를 켜면
 * 세션이 오래된(24시간 초과) 사용자의 `updateUser({ password })`는 이메일로 받은 6자리 코드(nonce) 없이
 * 거절된다 — 화면의 현재 비밀번호 확인은 첫 관문일 뿐, 훔친 세션으로 API를 직접 부르는 경우는
 * 이 nonce 가 막는다. 여기서는 그 거절을 알아보고 코드 입력 단계로 넘긴다.
 */
export interface AuthErrorLike {
  code?: string;
  message?: string;
}

export const REAUTHENTICATION_NEEDED = 'reauthentication_needed';
export const REAUTHENTICATION_NOT_VALID = 'reauthentication_not_valid';

/** 코드가 없어 거절됐다 — `auth.reauthenticate()`로 코드를 보내고 다시 시도해야 한다 */
export function needsReauthentication(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code === REAUTHENTICATION_NEEDED) return true;
  return /requires reauthentication/i.test(error.message ?? '');
}

/** 넣은 코드가 틀렸거나 만료됐다 */
export function isReauthenticationCodeInvalid(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code === REAUTHENTICATION_NOT_VALID) return true;
  return /nonce/i.test(error.message ?? '');
}

/** 이메일로 온 6자리 코드 — 공백을 걷어내고 숫자만 남긴다 */
export function normalizeReauthCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6);
}
