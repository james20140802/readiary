import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function isFriendWith(userId1: string, userId2: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('friends')
    .select('id')
    .or(
      `and(sender_id.eq.${userId1},recipient_id.eq.${userId2},accepted.eq.true),and(sender_id.eq.${userId2},recipient_id.eq.${userId1},accepted.eq.true)`
    )
    .maybeSingle();

  return !!data && !error;
}
