import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface BookExcerptEntry {
  id: string;
  date: string;
  quote: string | null;
}

export interface BookExcerptsData {
  bookTitle: string;
  author: string | null;
  isFinished: boolean;
  entries: BookExcerptEntry[];
}

/**
 * 발췌집 화면용 데이터 — fetchBookDetail의 임베디드 entries는 PostgREST 행 캡에 절단될 수 있어,
 * 발췌 수·마지막 기록일이 전량을 반영하도록 전용 페이지네이션 쿼리로 읽는다.
 * 본인 데이터 전용(비공개 포함) — RLS 하 로그인 사용자 소유 entries만 조회.
 */
export async function fetchBookExcerpts(bookId: string): Promise<BookExcerptsData | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const { data: userBook, error: userBookError } = await supabase
    .from('user_books')
    .select('id, is_finished, book:books (title, author)')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .single();

  if (userBookError || !userBook || !userBook.book) return null;

  const { rows: entries, error: entriesError } = await fetchAllRows<BookExcerptEntry>((from, to) =>
    supabase
      .from('entries')
      .select('id, date, quote')
      .eq('user_book_id', userBook.id)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );

  if (entriesError) return null;

  return {
    bookTitle: userBook.book.title,
    author: userBook.book.author,
    isFinished: userBook.is_finished ?? false,
    entries,
  };
}
