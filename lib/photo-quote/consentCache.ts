/**
 * 이 탭에서 사진 글자 읽기 동의를 확인했는지. 확인한 뒤로는 버튼을 누를 때마다 서버에 다시 묻지 않는다.
 * 계정에 묶어 둔다 — 로그아웃하거나 같은 탭에서 다른 계정으로 바뀌면 잊어, 앞 사람의 동의로
 * 동의 화면을 건너뛰지 않게 한다(AppShell이 로그인 상태가 바뀔 때 알려 준다).
 * 다른 기기에서 철회했다면 서버가 `consent_required`로 답하므로 그때 지우고 다시 묻는다.
 * 서버는 이 값과 무관하게 매번 동의를 확인한다. 여기 값은 화면 흐름만 정한다.
 */
let owner: string | null = null;
let known = false;

export function setPhotoConsentOwner(userId: string | null): void {
  if (userId === owner) return;
  owner = userId;
  known = false;
}

export function photoConsentKnown(): boolean {
  return known;
}

export function rememberPhotoConsent(consented: boolean): void {
  known = consented;
}

export function forgetPhotoTextConsent(): void {
  known = false;
}
