/** 'YYYY-MM' */
export type MonthKey = string;

export interface ExcerptItem {
  position: number;
  entryId: string;
  date: string;
  quote: string;
  note: string | null;
  /** 친구에게 내려가는 응답에는 없다. 없으면 공개로 본다. */
  isPrivate?: boolean;
  fromPage: number | null;
  toPage: number | null;
  /** book.id는 books.id */
  book: { id: string; title: string; author: string | null };
}

export interface MonthlyExcerpt {
  id: string;
  month: MonthKey;
  isShared: boolean;
  firstSharedAt: string | null;
  items: ExcerptItem[];
}

/** 고르기 화면의 후보 문장 */
export interface Candidate {
  entryId: string;
  date: string;
  quote: string;
  /** 생각 본문. 공백뿐이면 null. 엮기 미리보기가 쓴다 */
  note: string | null;
  hasNote: boolean;
  isPrivate: boolean;
  fromPage: number | null;
  toPage: number | null;
  userBookId: string;
  /** books.id — 발췌집 항목의 book.id와 같은 값 */
  bookId: string;
  bookTitle: string;
  author: string | null;
}

/** 그달에 문장을 남긴 책 (get_monthly_excerpt_month_books) */
export interface MonthBook {
  userBookId: string;
  title: string;
  quoteCount: number;
}

/** 해 목록의 한 줄 (get_my_monthly_excerpt_years) */
export interface YearRow {
  year: number;
  excerptCount: number;
  hasUnmade: boolean;
}

/** 한 해 안의 달 한 줄 (get_my_monthly_excerpt_year) */
export interface ExcerptMonthRow {
  month: MonthKey;
  /** 엮은 달은 발췌집의 문장 수, 안 엮은 달은 그달의 문장 수 */
  quoteCount: number;
  excerptId: string | null;
  isShared: boolean;
  coverQuote: string | null;
}

/** 지난달을 엮자는 안내 (get_monthly_excerpt_prompt) */
export interface ExcerptPrompt {
  month: MonthKey;
  quoteCount: number;
  bookCount: number;
}
