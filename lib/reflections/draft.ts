export const REFLECTION_DRAFT_PREFIX = 'readiary:reflection-draft:v1:';
export interface ReflectionDraft {
  body: string;
  is_private: boolean;
  updated_at?: string;
}
export function reflectionDraftKey(userId: string, entryId: string, reflectionId = 'new') {
  return `${REFLECTION_DRAFT_PREFIX}${userId}:${entryId}:${reflectionId}`;
}
export function readReflectionDraft(storage: Storage, key: string): ReflectionDraft | null {
  try {
    const value = JSON.parse(storage.getItem(key) ?? 'null');
    return value && typeof value.body === 'string' && typeof value.is_private === 'boolean'
      ? value
      : null;
  } catch {
    return null;
  }
}
export function clearOtherReflectionDrafts(storage: Storage, userId: string | null) {
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (
      key?.startsWith(REFLECTION_DRAFT_PREFIX) &&
      (!userId || !key.startsWith(`${REFLECTION_DRAFT_PREFIX}${userId}:`))
    )
      storage.removeItem(key);
  }
}
export function announceReflectionChange(entryId: string) {
  window.dispatchEvent(new CustomEvent('readiary:reflections-changed', { detail: entryId }));
}
