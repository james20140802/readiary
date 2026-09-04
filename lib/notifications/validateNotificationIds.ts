import { isUuid } from '@/lib/share/validation';

/** /api/notifications/read 가 한 번에 읽음 처리할 수 있는 id 최대 개수 */
export const MAX_NOTIFICATION_READ_IDS = 100;

/**
 * ids 요청 필드를 검증한다 — UUID 문자열로만 이루어진 1~100개 배열이어야 유효.
 * 하나라도 UUID가 아니면 Postgres가 500으로 던지기 전에 여기서 400으로 걸러낸다.
 */
export function validateNotificationIds(ids: unknown): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.length <= MAX_NOTIFICATION_READ_IDS &&
    ids.every((id) => typeof id === 'string' && isUuid(id))
  );
}
