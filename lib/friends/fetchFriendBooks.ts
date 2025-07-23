import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MyBook } from '@/types/book';
import { Profile } from '@/types/profile';
import { isFriendWith } from './isFriendWith';

export async function fetchFriendBooks(
  nickname: string,
  tag: string
): Promise<{ profile: Profile; books: MyBook[] } | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  // 친구 프로필을 찾기
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('nickname', nickname)
    .eq('tag', tag)
    .single();

  if (profileError || !profile) return null;

  // 친구인지 확인
  const isFriend = isFriendWith({ nickname, tag });

  if (!isFriend) return null;

  // 친구의 책 목록 가져오기
  const { data: userBooks, error: booksError } = await supabase
    .from('user_books')
    .select(
      `
        id,
        book_id,
        progress,
        started_at,
        is_finished,
        last_read_page,
        books (*)
      `
    )
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (booksError || !userBooks) return { profile, books: [] };

  return { profile, books: userBooks };
}
