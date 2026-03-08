import { EntryDetailData } from './entry';
import { Database, Tables } from './supabase';

export type BookFetch = Database['public']['Tables']['books']['Row'];

export type MyBookFetch = Database['public']['Tables']['user_books']['Row'];

export type MyBook = {
  id: string;
  book_id: string;
  progress: number | null;
  created_at: string | null;
  is_finished: boolean | null;
  last_read_page: number | null;
  books: Book;
};

export type Book = {
  id: string;
  title: string;
  author: string | null;
  total_pages: number | null;
  cover_url?: string | null;
  isbn?: string | null;
};

export type UserBookWithCover = Tables<'user_books'> & {
  books: Tables<'books'>;
};

export type BookDetailData = {
  userBook: MyBook;
  entries: EntryDetailData[] | null;
};

export type BookSearchResult = {
  title: string;
  authors: string[];
  publisher: string;
  thumbnail: string;
  isbn: string;
  contents: string;
  datetime: string;
  totalPages?: number;
  url: string;
};
