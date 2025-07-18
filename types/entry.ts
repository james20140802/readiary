import { Book } from './book';
import { Profile } from './profile';

export type Entry = {
  id: string;
  date: string;
  summary: string | null;
  from_page: number | null;
  to_page: number | null;
  is_private: boolean;
  book: Book;
};

export type SocialFeedEntry = {
  profile: Profile;
  entry: Entry;
};

export type RawEntry = {
  id: string;
  summary: string | null;
  date: string;
  from_page: number | null;
  to_page: number | null;
  created_at: string | null;
  user_books: {
    user_id: string;
    book_id: string;
    books: Book;
  };
};

export type EntryDetailData = {
  entry: Entry;
  userId: string;
};
