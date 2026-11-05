/** 기록의 쪽 표기 — 'p.88', 'p.88–92'. 쪽이 없으면 null */
export function formatPages(fromPage?: number | null, toPage?: number | null) {
  if (fromPage != null && toPage != null && fromPage !== toPage) return `p.${fromPage}–${toPage}`;
  const page = fromPage ?? toPage;
  return page != null ? `p.${page}` : null;
}
