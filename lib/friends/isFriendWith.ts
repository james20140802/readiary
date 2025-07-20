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
      `and(sender_id.eq.${currentUserId},recipient_id.eq.${targetUserId},accepted.eq.true),and(sender_id.eq.${targetUserId},recipient_id.eq.${currentUserId},accepted.eq.true)`
    )
    .maybeSingle();

  return !!data && !error;
}
