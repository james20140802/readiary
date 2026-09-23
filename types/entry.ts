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
};

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
};

/** On-demand reading payload with viewer permissions and canonical navigation. */
export interface EntryReadData {
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
