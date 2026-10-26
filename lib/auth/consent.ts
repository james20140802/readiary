/**
 * 가입 확인(만 14세 이상 확인 + 이용 약관·개인정보처리방침 고지)을 마쳤음을 남기는 Supabase
 * user_metadata 키(ISO 시각). 키 이름은 가입 화면에서 체크박스 세 개로 동의를 받던 때의 것을 잇는다 —
 * 그때 가입한 계정은 이미 이 표식을 갖고 있어 다시 묻지 않는다.
 *
 * 이제 이메일·Google 가입 모두 온보딩에서 만 14세를 확인하고, 프로필을 만들 때 /api/onboarding 이
 * 표식을 남긴다. 이용 약관·개인정보는 체크로 받지 않고 가입 화면과 온보딩에 고지한다(LegalNotice).
 *
 * 메타데이터는 사용자가 클라이언트에서 고칠 수 있는 값이지만, 확인은 본인 계정에 대한 본인의
 * 행위라 위조해 봐야 자기 확인 화면을 건너뛰는 것뿐이다 — 다른 사람에게 미치는 영향이 없다.
 */
export const CONSENTED_AT_KEY = 'consented_at';

/** 가입 확인 표식이 있는지 — 비어 있지 않은 문자열이면 확인한 것으로 본다 */
export function hasConsented(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const value = (metadata as Record<string, unknown>)[CONSENTED_AT_KEY];
  return typeof value === 'string' && value.trim() !== '';
}

/** 지금 확인했다는 표식 값 */
export function consentStamp(now: Date = new Date()): string {
  return now.toISOString();
}

export const CONSENT_REQUIRED_MESSAGE =
  'Readiary는 만 14세 이상만 쓸 수 있어요. 만 14세 이상인지 확인해 주세요.';
