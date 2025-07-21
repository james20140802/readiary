import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function isFriendWith({ nickname, tag }: { nickname: string; tag: string }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return false;

  const currentUserId = user.id;

  // 상대 유저 ID 가져오기
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .eq('tag', tag)
    .maybeSingle();

  if (!profile || profileError) return false;

  const targetUserId = profile.id;

  const { data, error } = await supabase
    .from('friends')
    .select('id')
    .or(
      `and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId},status.eq.accepted),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId},status.eq.accepted)`
    )
    .maybeSingle();

  return !!data && !error;
}
