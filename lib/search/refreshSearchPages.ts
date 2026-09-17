import type { SearchCursor, SearchPage } from './types';

// Restart from the first page: mutation can invalidate both rows and old cursors.
// Keep the previously expanded depth without fetching the entire library.
export async function refreshSearchPages<T>(
  fetchPage: (cursor: SearchCursor | null) => Promise<SearchPage<T>>,
  previousCount: number,
  signal: AbortSignal
): Promise<SearchPage<T>> {
  const items: T[] = [];
  let next: SearchCursor | null = null;
  do {
    signal.throwIfAborted();
    const page = await fetchPage(next);
    signal.throwIfAborted();
    items.push(...page.items);
    next = page.next;
    if (!page.items.length) break;
  } while (next && items.length < previousCount);
  return { items, next };
}
