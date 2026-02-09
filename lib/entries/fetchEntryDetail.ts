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
              user_id,
              books (
                id,
                title,
                author,
                cover_url,
                total_pages,
                isbn
              )
            ),
            likes (
             user_id
            )
          `
    )
    .eq('id', entryId)
    .single();

  if (error || !data || user.id !== data.user_books.user_id) return null;

  const isLiked = data.likes?.some((like) => like.user_id === user.id) ?? false;
  const likeCount = data.likes?.length ?? 0;

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
    initialLiked: isLiked,
    initialLikeCount: likeCount,
  };
}
