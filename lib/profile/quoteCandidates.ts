export const QUOTE_PAGE_SIZE = 30;

/** PostgREST OR 문법과 LIKE 와일드카드를 구분하여 검색어를 리터럴로 전달한다. */
export function quoteSearchFilter(search: string, books: [string, string][]): string | null {
  const term = search.trim().normalize('NFKC');
  if (!term) return null;
  const pattern = '%' + term.replace(/[\\%_]/g, '\\$&') + '%';
  // PostgREST는 LIKE의 *를 %로 치환한다. 별표가 있으면 이스케이프한 정규식으로
  // 리터럴 부분 문자열을 검색해 별표가 와일드카드나 퍼센트로 변하는 것을 피한다.
  const quoteFilter = term.includes('*')
    ? 'quote.imatch.' + JSON.stringify(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    : 'quote.ilike.' + JSON.stringify(pattern);
  const matchingIds = books
    .filter(([, title]) =>
      title.normalize('NFKC').toLocaleLowerCase().includes(term.toLocaleLowerCase())
    )
    .map(([id]) => id);
  return [
    quoteFilter,
    ...(matchingIds.length
      ? ['user_book_id.in.(' + matchingIds.map((id) => JSON.stringify(id)).join(',') + ')']
      : []),
  ].join(',');
}
