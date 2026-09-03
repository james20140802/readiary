export interface MonthlySummary {
  label: string;
  count: number;
  /** 그 달에 기록한 책 제목 — 최근 것부터, MONTH_PAGE_BOOKS개까지 */
  books: string[];
  /** 그 달의 인용 — 최근 것부터, MONTH_PAGE_QUOTES개까지 */
  quotes: string[];
}

export interface MonthEntry {
  /** yyyy-MM-dd */
  date: string;
  quote?: string | null;
  bookTitle?: string | null;
}

/** 달 페이지에 싣는 책 제목·인용 수 — 한 면에 들어갈 만큼만 */
export const MONTH_PAGE_BOOKS = 6;
export const MONTH_PAGE_QUOTES = 3;

/**
 * 기록을 월 단위로 집계해 최근 months개월(이번 달 포함)을 최신순으로 반환한다.
 * 기록이 없는 달도 count 0으로 채운다. entries는 오래된 것부터 정렬돼 있다고 보고,
 * 책 제목·인용은 뒤에서부터(최근 것부터) 고른다.
 */
export function summarizeByMonth(
  entries: MonthEntry[],
  todayKst: string,
  months: number
): MonthlySummary[] {
  const byMonthKey = new Map<string, MonthEntry[]>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const bucket = byMonthKey.get(key);
    if (bucket) bucket.push(entry);
    else byMonthKey.set(key, [entry]);
  }

  const [todayYear, todayMonth] = todayKst.slice(0, 7).split('-').map(Number);
  const startIndex = todayYear * 12 + (todayMonth - 1);

  return Array.from({ length: months }, (_, i) => {
    const monthIndex = startIndex - i;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const bucket = byMonthKey.get(key) ?? [];

    const books: string[] = [];
    const quotes: string[] = [];
    for (let j = bucket.length - 1; j >= 0; j -= 1) {
      const { quote, bookTitle } = bucket[j];
      const trimmedQuote = quote?.trim();
      if (trimmedQuote && quotes.length < MONTH_PAGE_QUOTES) quotes.push(trimmedQuote);
      if (bookTitle && books.length < MONTH_PAGE_BOOKS && !books.includes(bookTitle)) {
        books.push(bookTitle);
      }
    }

    return { label: `${year}년 ${month}월`, count: bucket.length, books, quotes };
  });
}
