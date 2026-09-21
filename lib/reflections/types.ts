export interface EntryReflection {
  id: string;
  entry_id: string;
  body: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}
export interface ReflectionSummary {
  total: number;
  latest: Pick<EntryReflection, 'id' | 'body' | 'created_at' | 'is_private'> | null;
}
export interface ReflectionPage {
  items: EntryReflection[];
  nextCursor: string | null;
  summary: ReflectionSummary;
  canWrite: boolean;
  entryIsPrivate: boolean;
  viewerId: string;
}
export const REFLECTION_LIMIT = 10000;
export const REFLECTION_PAGE_SIZE = 20;
export function validReflectionBody(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Array.from(value.trim()).length <= REFLECTION_LIMIT
  );
}
export const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function parseReflectionCursor(value: string | null): { date: string; id: string } | null {
  if (!value) return null;
  try {
    const [date, id] = JSON.parse(value);
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      typeof id !== 'string' ||
      !uuidPattern.test(id)
    )
      return null;
    return { date, id };
  } catch {
    return null;
  }
}
