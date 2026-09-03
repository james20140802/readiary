/**
 * 닉네임 형식 규칙 — 온보딩·프로필 수정·훅에서 공유한다.
 * 영어 알파벳·숫자·언더스코어만 허용(하이픈 금지): 친구 프로필 라우트가
 * `${nickname}-${tag}` 슬러그를 마지막 '-'에서 분할하므로, 닉네임에 '-'가
 * 섞이면 슬러그 파싱이 깨질 수 있다 (lib/social/invite.ts 참고).
 */
export const NICKNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/** OnboardingForm에 기존 길이 제한이 없어 새로 정한 상한 — 온보딩·수정·훅 전체에 동일 적용 */
export const MAX_NICKNAME_LENGTH = 20;

/** 유효하면 null, 아니면 사용자에게 보여줄 한국어 오류 메시지를 반환한다. */
export function validateNickname(value: string): string | null {
  if (!value) {
    return '닉네임을 입력해주세요.';
  }
  if (value.length > MAX_NICKNAME_LENGTH) {
    return `닉네임은 ${MAX_NICKNAME_LENGTH}자 이하여야 합니다.`;
  }
  if (!NICKNAME_PATTERN.test(value)) {
    return '닉네임은 영어 알파벳과 숫자, 언더스코어(_)만 사용할 수 있습니다.';
  }
  return null;
}
