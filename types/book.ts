import { Database, Tables } from './supabase';

export type BookFetch = Database['public']['Tables']['books']['Row'];

export type MyBookFetch = Database['public']['Tables']['user_books']['Row'];

export type MyBook = {
  id: string;
  book_id: string;
  progress: number | null;
  started_at: string | null;
  is_finished: boolean | null;
  last_read_page: number | null;
  books: Book;
};

export type Book = { title: string; author: string | null; total_pages: number | null };

export type UserBookWithCover = Tables<'user_books'> & {
  books: Tables<'books'>;
};
