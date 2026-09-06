export const QUOTE_PAGE_SIZE = 30;

/** PostgREST OR 문법과 LIKE 와일드카드를 구분하여 검색어를 리터럴로 전달한다. */
export function quoteSearchFilter(search: string, books: [string, string][]): string | null {
  const term = search.trim().normalize('NFKC');
  if (!term) return null;
  const pattern = '%' + term.replace(/[\\%_]/g, '\\$&') + '%';
  const matchingIds = books
    .filter(([, title]) =>
      title.normalize('NFKC').toLocaleLowerCase().includes(term.toLocaleLowerCase())
    )
    .map(([id]) => id);
  return [
    'quote.ilike.' + JSON.stringify(pattern),
    ...(matchingIds.length
      ? ['user_book_id.in.(' + matchingIds.map((id) => JSON.stringify(id)).join(',') + ')']
      : []),
  ].join(',');
}
