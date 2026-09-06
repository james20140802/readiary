/**
 * 서비스 이용 약관·개인정보 수집 동의를 마쳤음을 남기는 Supabase user_metadata 키(ISO 시각).
 *
 * 이메일 가입은 가입 화면에서 동의를 받고 signUp 때 실어 둔다. 소셜 로그인(Google)은 로그인과
 * 가입을 구분할 수 없어 로그인 화면에서도 계정이 생기므로, 이 표식이 없는 계정은 온보딩에서
 * 동의를 받은 뒤에야 프로필을 만든다. 가입 화면의 Google 버튼은 동의 뒤에만 눌리므로
 * `/auth/confirm?consent=1` 로 표식을 넘겨 온보딩에서 다시 묻지 않는다.
 *
 * 메타데이터는 사용자가 클라이언트에서 고칠 수 있는 값이지만, 동의는 본인 계정에 대한 본인의
 * 행위라 위조해 봐야 자기 동의 화면을 건너뛰는 것뿐이다 — 다른 사람에게 미치는 영향이 없다.
 */
export const CONSENTED_AT_KEY = 'consented_at';

/** 동의 표식이 있는지 — 비어 있지 않은 문자열이면 동의한 것으로 본다 */
export function hasConsented(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const value = (metadata as Record<string, unknown>)[CONSENTED_AT_KEY];
  return typeof value === 'string' && value.trim() !== '';
}

/** 지금 동의했다는 표식 값 */
export function consentStamp(now: Date = new Date()): string {
  return now.toISOString();
}

export const CONSENT_REQUIRED_MESSAGE =
  '개인정보 수집·이용과 서비스 이용 약관에 동의해야 가입할 수 있습니다.';
