import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function fetchBookBasicInfo(bookId: string) {
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
      id,
      book:books (
        id,
        title,
        author,
        cover_url,
        isbn,
        total_pages
      )
    `
    )
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .single();

  if (error || !data || !data.book) return null;

  return {
    userBookId: data.id,
    userId: user.id,
    book: data.book,
  };
}
