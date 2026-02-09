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
  created_at: string;
};

export type SocialFeedEntry = {
  profile: Profile;
  entry: Entry;
};

export type DetailSocialFeedEntry = {
  profile: Profile;
  entry: Entry;
  initialLikeCount: number;
  initialLiked: boolean;
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

export type RawDetailEntry = {
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
  likes: {
    user_id: string;
  }[];
};

export type EntryDetailData = {
  entry: Entry;
  userId: string;
  initialLiked: boolean;
  initialLikeCount: number;
};
