import { Stats } from '@/types/profile';
import { createSupabaseServerClient } from '../supabase/server';

export async function getUserStats(userId: string): Promise<Stats | null> {
  const supabase = await createSupabaseServerClient();

  const { data: books, error: booksError } = await supabase
    .from('user_books')
    .select('id, is_finished')
    .eq('user_id', userId);

  if (booksError || !books) {
    console.error('Error fetching books:', booksError);
    return null;
  }

  const bookIds = books.map((book) => book.id);

  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('id, from_page, to_page, user_book_id')
    .in('user_book_id', bookIds);

  if (entriesError || !entries) {
    console.error('Error fetching entries:', entriesError);
    return null;
  }

  const totalBooks = books.length;
  const finishedBooks = books.filter((book) => book.is_finished).length;
  const totalEntries = entries.length;
  // 페이지 범위는 양끝 포함(inclusive)으로 센다 — 100~100은 1쪽
  const totalPages = entries.reduce(
    (sum, e) =>
      e.from_page != null && e.to_page != null
        ? sum + Math.max(0, e.to_page - e.from_page + 1)
        : sum,
    0
  );

  return {
    totalBooks,
    finishedBooks,
    totalEntries,
    totalPages,
  };
}
