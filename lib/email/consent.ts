export const EMAIL_COPY_VERSION = 'email-news-v1';
export const EMAIL_CONSENT_LABEL = 'Readiary 소식·이벤트 이메일 받기 (선택)';
export const EMAIL_CONSENT_DETAILS =
  '이메일 주소를 Readiary의 새 기능·리뉴얼·이벤트 소식에 이용합니다. 개인 독서 기록은 메일 생성에 사용하지 않습니다. 거부해도 가입과 이용에 제한이 없으며, 알림 설정이나 메일의 수신거부 링크에서 언제든 철회할 수 있습니다. 동의와 철회 이력은 탈퇴 시까지 보관합니다.';
export interface EmailPreferences {
  enabled: boolean;
  email: string | null;
  version: number;
  consented_at: string | null;
  withdrawn_at: string | null;
}
export interface ConsentChange {
  accountId: string;
  expectedEmail: string | null;
  enabled: boolean;
  requestId: string;
  expectedVersion: number;
  copyVersion: typeof EMAIL_COPY_VERSION;
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validConsentChange(value: unknown): value is ConsentChange {
  if (!value || typeof value !== 'object') return false;
  const v = value as ConsentChange;
  return (
    typeof v.accountId === 'string' &&
    UUID.test(v.accountId) &&
    (v.expectedEmail === null ||
      (typeof v.expectedEmail === 'string' &&
        v.expectedEmail.length > 0 &&
        v.expectedEmail.length <= 320)) &&
    typeof v.enabled === 'boolean' &&
    typeof v.requestId === 'string' &&
    UUID.test(v.requestId) &&
    Number.isSafeInteger(v.expectedVersion) &&
    v.expectedVersion >= 0 &&
    v.copyVersion === EMAIL_COPY_VERSION
  );
}
