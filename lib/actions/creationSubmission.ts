import { isEntryRequestId } from '@/lib/entries/saveRequest';

export const CREATION_PREFIX = 'readiary:creation:v1:';
export interface CreationSubmission<T> {
  id: string;
  userId: string;
  payload: T;
}
export function submissionKey(userId: string, scope: string) {
  return `${CREATION_PREFIX}${userId}:${scope}`;
}
export function readSubmission<T>(
  storage: Storage,
  key: string,
  userId: string
): CreationSubmission<T> | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (
    !parsed ||
    parsed.userId !== userId ||
    !isEntryRequestId(parsed.id) ||
    !parsed.payload ||
    typeof parsed.payload !== 'object'
  ) {
    throw new Error('저장 확인 정보를 읽지 못했어요. 페이지를 새로고침해 주세요.');
  }
  return parsed;
}
export function clearCreationSubmissions(storage: Storage, keepUser?: string) {
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (
      key?.startsWith(CREATION_PREFIX) &&
      (!keepUser || !key.startsWith(`${CREATION_PREFIX}${keepUser}:`))
    )
      storage.removeItem(key);
  }
}
