import type { SearchRequest, SearchCursor } from './types';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function date(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function parseSearchRequest(body: unknown): SearchRequest {
  if (!body || typeof body !== 'object') throw new Error('검색 조건을 확인해 주세요.');
  const b = body as Record<string, unknown>;
  if (
    typeof b.query !== 'string' ||
    b.query.length > 200 ||
    !['books', 'entries', 'candidates'].includes(String(b.kind))
  )
    throw new Error('검색어는 200자 이내로 입력해 주세요.');
  const query = b.query.trim();
  if (!query && b.kind !== 'candidates') throw new Error('검색어를 입력해 주세요.');
  if (b.bookId && (typeof b.bookId !== 'string' || !uuid.test(b.bookId)))
    throw new Error('책을 다시 선택해 주세요.');
  if (
    (b.from && !date(b.from)) ||
    (b.to && !date(b.to)) ||
    (b.from && b.to && String(b.from) > String(b.to))
  )
    throw new Error('시작일과 종료일을 확인해 주세요.');
  let cursor: SearchCursor | null = null;
  if (b.cursor != null) {
    const c = b.cursor as SearchCursor;
    if (
      !c ||
      typeof c.id !== 'string' ||
      !uuid.test(c.id) ||
      typeof c.created !== 'string' ||
      c.created.length > 40 ||
      !Number.isFinite(Date.parse(c.created)) ||
      (b.kind === 'entries' && !date(c.date))
    )
      throw new Error('목록을 처음부터 다시 검색해 주세요.');
    cursor = { id: c.id, created: c.created, ...(b.kind === 'entries' ? { date: c.date } : {}) };
  }
  return {
    query,
    kind: b.kind as SearchRequest['kind'],
    bookId: b.bookId as string | undefined,
    from: b.from as string | undefined,
    to: b.to as string | undefined,
    cursor,
  };
}
