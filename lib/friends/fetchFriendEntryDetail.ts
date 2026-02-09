import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EntryDetailData } from '@/types/entry';
import { Profile } from '@/types/profile';
import { isFriendWith } from './isFriendWith';

export async function fetchFriendEntryDetail(
  nickname: string,
  tag: string,
  entryId: string
): Promise<{ entry: EntryDetailData; profile: Profile } | null> {
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
            ),
            likes (
              user_id
            ),
            comments:comments(count)
          `
    )
    .eq('id', entryId)
    .single();

  if (error || !data) return null;

  const isLiked = data.likes?.some((like) => like.user_id === user.id) ?? false;
  const likeCount = data.likes?.length ?? 0;

  return {
    entry: {
      entry: {
        id: data.id,
        summary: data.summary,
        from_page: data.from_page,
        to_page: data.to_page,
        date: data.date,
        is_private: data.is_private,
        book: data.user_books.books,
        created_at: data.created_at ?? data.date,
      },
      userId: profile.id,
      initialLiked: isLiked,
      initialLikeCount: likeCount,
      initialCommentCount: data.comments[0]?.count ?? 0,
    },
    profile,
  };
}
