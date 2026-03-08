import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFriendWith } from './isFriendWith';
import { MyBook } from '@/types/book';
import { EntryDetailData } from '@/types/entry';
import { Profile } from '@/types/profile';

export async function fetchFriendBookEntries({
  nickname,
  tag,
  bookId,
}: {
  nickname: string;
  tag: string;
  bookId: string;
}): Promise<{
  profile: Profile;
  book: MyBook;
  entries: EntryDetailData[];
} | null> {
  const supabase = await createSupabaseServerClient();

  const isFriend = await isFriendWith({ nickname, tag });
  if (!isFriend) return null;

  // Step 1: Find friend's user_id from nickname and tag
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('nickname', nickname)
    .eq('tag', tag)
    .single();

  if (!profile || profileError) return null;

  // Check if the requesting user is friends with this user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) return null;

  // Step 2: Find user_book.id for this user and book
  const { data: userBook, error: userBookError } = await supabase
    .from('user_books')
    .select(
      `
        id,
        book_id,
        progress,
        created_at,
        is_finished,
        last_read_page,
        books (*)
      `
    )
    .eq('user_id', profile.id)
    .eq('book_id', bookId)
    .single();

  if (!userBook || userBookError) return null;

  // Step 3: Get public entries
  const { data: entriesResult, error: entriesError } = await supabase
    .from('entries')
    .select(
      `
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
          `
    )
    .eq('user_book_id', userBook.id)
    .eq('is_private', false)
    .order('date', { ascending: false });

  if (entriesError) return null;

  const entries = entriesResult.map((e): EntryDetailData => {
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
  });

  return {
    profile,
    book: userBook,
    entries: entries,
  };
}
