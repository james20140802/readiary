export type SearchKind = 'books' | 'entries' | 'candidates';
export type SearchTab = 'all' | 'books' | 'entries';
export interface SearchCursor {
  id: string;
  created: string;
  date?: string;
}
export interface SearchBook {
  id: string;
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
}
export interface SearchEntry {
  id: string;
  bookId: string;
  title: string;
  date: string;
  fromPage: number | null;
  toPage: number | null;
  quote: string | null;
  note: string | null;
}
export interface SearchPage<T> {
  items: T[];
  next: SearchCursor | null;
}
export interface SearchRequest {
  query: string;
  kind: SearchKind;
  bookId?: string;
  from?: string;
  to?: string;
  cursor?: SearchCursor | null;
}
