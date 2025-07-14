import { createSupabaseClient } from '../supabase';

export async function getUserStats(userId: string) {
  const supabase = createSupabaseClient();

  const { data: books, error: booksError } = await supabase
    .from('user_books')
    .select('id, is_finished')
    .eq('user_id', userId);

  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('id, from_page, to_page')
    .eq('user_id', userId);

  if (booksError || entriesError || !books || !entries) {
    console.error('Error fetching stats:', booksError, entriesError);
    return null;
  }

  const totalBooks = books.length;
  const finishedBooks = books.filter((book) => book.is_finished).length;
  const totalEntries = entries.length;
  const totalPages = entries.reduce((sum, e) => sum + ((e.to_page ?? 0) - (e.from_page ?? 0)), 0);

  return {
    totalBooks,
    finishedBooks,
    totalEntries,
    totalPages,
  };
}
