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
