import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BookDetailData } from '@/types/book';

export async function fetchBookDetail(bookId: string): Promise<BookDetailData | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const { data, error } = await supabase
    .from('user_books')
    .select(
      `
        id, progress, started_at, last_read_page, is_finished,
        book:books (
          id,
          title,
          author,
          cover_url,
          isbn,
          total_pages
        ),
        entries:entries (
          id,
          summary,
          from_page,
          to_page,
          date,
          is_private,
          created_at
        )
      `
    )
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .single();

  if (error || !data) return null;

  return {
    userBook: {
      id: data.id,
      progress: data.progress,
      started_at: data.started_at,
      last_read_page: data.last_read_page,
      is_finished: data.is_finished,
      books: data.book,
      book_id: data.book.id,
    },
    entries: data.entries
      ? data.entries.map((entry) => ({
          ...entry,
          book: data.book,
        }))
      : [],
  };
}
