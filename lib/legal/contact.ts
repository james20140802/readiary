/**
 * 이용자 문의·개인정보 관련 요청을 받는 이메일. Google OAuth 브랜딩의 "사용자 지원 이메일"과
 * 같은 주소를 쓰는 것이 원칙이다(동의 화면과 방침의 연락처가 어긋나면 검토에서 걸린다).
 *
 * 코드에 주소를 박지 않고 env로 받는다 — 운영자가 바뀌거나 전용 메일함을 열 때 배포만으로 바꾼다.
 * 비어 있으면 화면은 mailto 링크를 그리지 않고 "준비 중"으로 표시한다.
 */
export const SUPPORT_EMAIL: string | null = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return raw ? raw : null;
})();

/** 방침 본문에 끼워 넣을 연락처 문구 */
export function describeSupportContact(email: string | null = SUPPORT_EMAIL): string {
  return email ? `이메일 ${email}` : '서비스 문의 이메일(준비 중)';
}
