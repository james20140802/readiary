import type { ReflectionSummary } from '@/lib/reflections/types';
import { Book } from './book';
import { Profile } from './profile';

export type Entry = {
  reflectionSummary?: ReflectionSummary | null;
  id: string;
  date: string;
  note: string | null;
  quote: string | null;
  from_page: number | null;
  to_page: number | null;
  is_private: boolean;
  book: Book;
  created_at: string;
};

export type DetailSocialFeedEntry = {
  profile: Profile;
  entry: Entry;
  initialLikeCount: number;
  initialLiked: boolean;
  initialCommentCount: number;
  /** 이 기록의 문장을 그 달의 문장으로 골랐는가 — 내 기록 한 장을 열 때만 채운다 */
  isMonthlySentence?: boolean;
};

/** 친구 피드의 한 항목: 기록 하나 */
export type SocialFeedEntryItem = DetailSocialFeedEntry & { kind: 'entry' };

/** 친구 피드의 한 항목: 처음 공개한 때 한 번 뜨는 달의 발췌집. 표지와 수는 친구에게 보이는 문장 기준이다 */
export type SocialFeedExcerptItem = {
  kind: 'monthly_excerpt';
  id: string;
  /** 'YYYY-MM' */
  month: string;
  /** 처음 공개한 시각 */
  sharedAt: string;
  profile: Profile;
  coverQuote: string;
  /** 표지 문장의 출처 */
  coverBookTitle: string;
  quoteCount: number;
  bookCount: number;
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount: number;
  /** 이 기록의 문장을 그 달의 문장으로 골랐는가 — 내 기록 한 장을 열 때만 채운다 */
  isMonthlySentence?: boolean;
};

export type SocialFeedItem = SocialFeedEntryItem | SocialFeedExcerptItem;

export type RawDetailEntry = {
  id: string;
  note: string | null;
  quote: string | null;
  date: string;
  from_page: number | null;
  to_page: number | null;
  created_at: string | null;
  user_books: {
    user_id: string;
    book_id: string;
    books: Book;
  };
  likes: {
    user_id: string;
  }[];
  comments: {
    id: string;
  }[];
};

export type EntryDetailData = {
  entry: Entry;
  userId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount: number;
  /** 이 기록의 문장을 그 달의 문장으로 골랐는가 — 내 기록 한 장을 열 때만 채운다 */
  isMonthlySentence?: boolean;
};

/** On-demand reading payload with viewer permissions and canonical navigation. */
export interface EntryReadData {
  reflectionSummary?: ReflectionSummary | null;
  canWrite: boolean;
  entryIsPrivate: boolean;
  viewerId: string;
  detailHref: string;
  id: string;
  bookTitle: string;
  date: string;
  fromPage: number | null;
  toPage: number | null;
  quote: string | null;
  note: string | null;
}
