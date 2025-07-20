import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EntryDetailData } from '@/types/entry';

export async function fetchEntryDetail(entryId: string): Promise<EntryDetailData | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const { data, error } = await supabase
    .from('entries')
    .select(
      `
            id,
            summary,
            from_page,
            to_page,
            date,
            created_at,
            user_book_id,
            is_private,
            user_books (
              book_id,
              books (
                id,
                title,
                author,
                cover_url,
                total_pages,
                isbn
              )
            )
          `
    )
    .eq('id', entryId)
    .single();

  if (error || !data) return null;

  return {
    entry: {
      id: data.id,
      summary: data.summary,
      from_page: data.from_page,
      to_page: data.to_page,
      date: data.date,
      is_private: data.is_private,
      book: data.user_books.books,
    },
    userId: user.id,
  };
}
