import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BookDetailData } from '@/types/book';
import { EntryDetailData } from '@/types/entry';

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
          *,
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
            ),
            likes (
              user_id
            ),
            comments:comments(count)
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
      ? data.entries.map((e): EntryDetailData => {
          const isLiked = e.likes?.some((like) => like.user_id === user.id) ?? false;
          const likeCount = e.likes?.length ?? 0;
          return {
            entry: {
              id: e.id,
              date: e.date,
              summary: e.summary,
              from_page: e.from_page,
              to_page: e.to_page,
              is_private: e.is_private,
              book: e.user_books.books,
              created_at: e.created_at ?? e.date,
            },
            userId: user.id,
            initialLiked: isLiked,
            initialLikeCount: likeCount,
            initialCommentCount: e.comments[0]?.count ?? 0,
          };
        })
      : [],
  };
}
