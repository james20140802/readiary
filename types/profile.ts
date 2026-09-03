import { UserBookWithCover } from './book';

export type Profile = {
  id: string;
  name: string;
  nickname: string;
  tag: string;
  bio: string | null;
  created_at: string | null;
  profile_image: string | null;
  /** 뒷표지에 싣는 대표 인용(entries.id). 마이그레이션 전 행에는 없을 수 있어 optional */
  featured_entry_id?: string | null;
  /** 책 윗면에 끼운 책갈피 — 완독한 책(user_books.id) */
  bookmark_user_book_id?: string | null;
};

/** 책갈피가 가리키는 발췌집 — 책이 그 페이지로 펼쳐질 때 보이는 것 */
export type FeaturedBookmark = {
  userBookId: string;
  bookId: string;
  title: string;
  quoteCount: number;
  /** 최근 인용 몇 토막 — 펼친 페이지에 실린다 */
  quotes: string[];
};

/** 뒷표지에 실리는 인용 한 토막 — 문장과 출처 */
export type FeaturedQuote = {
  entryId: string;
  quote: string;
  bookTitle: string | null;
  author: string | null;
};

export type ProfileFullData = {
  profile: Profile | null;
  userBooks: UserBookWithCover[];
};

export type Stats = {
  totalBooks: number;
  totalEntries: number;
  totalPages: number;
  finishedBooks: number;
};
