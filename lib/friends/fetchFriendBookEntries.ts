import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFriendWith } from './isFriendWith';
import { Book } from '@/types/book';
import { Entry } from '@/types/entry';
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
  book: Book;
  entries: Entry[];
} | null> {
  const supabase = await createSupabaseServerClient();

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

  const isFriend = await isFriendWith(user.id, profile.id);
  if (!isFriend) return null;

  // Step 2: Find user_book.id for this user and book
  const { data: userBook, error: userBookError } = await supabase
    .from('user_books')
    .select('id, book:books (id, title, author, cover_url, total_pages)')
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
            )
          `
    )
    .eq('user_book_id', userBook.id)
    .eq('is_private', false)
    .order('date', { ascending: false });

  if (entriesError) return null;

  const entries = entriesResult.map(
    (e): Entry => ({
      id: e.id,
      date: e.date,
      summary: e.summary,
      from_page: e.from_page,
      to_page: e.to_page,
      is_private: e.is_private,
      book: e.user_books.books,
    })
  );

  return {
    profile,
    book: userBook.book,
    entries,
  };
}
