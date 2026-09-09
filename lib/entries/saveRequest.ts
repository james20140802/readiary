/** Client-provided primary key: retries target the same entry without overwriting it. */
export function isEntryRequestId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}
export interface EntrySubmission {
  id: string;
  date: string;
  bookTitle: string;
}
export function isEntrySubmission(value: unknown): value is EntrySubmission {
  if (!value || typeof value !== 'object') return false;
  const request = value as EntrySubmission;
  return (
    isEntryRequestId(request.id) &&
    typeof request.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(request.date) &&
    typeof request.bookTitle === 'string'
  );
}
