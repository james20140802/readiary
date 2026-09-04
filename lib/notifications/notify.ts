import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Supabase = SupabaseClient<Database>;

export async function notifyEntryEvent(
  supabase: Supabase,
  entryId: string,
  type: 'like' | 'comment'
): Promise<void> {
  const { error } = await supabase.rpc('notify_entry_event', {
    p_entry_id: entryId,
    p_type: type,
  });
  if (error) console.error('notify_entry_event 실패:', error.message);
}

export async function retractLikeNotification(supabase: Supabase, entryId: string): Promise<void> {
  const { error } = await supabase.rpc('retract_like_notification', { p_entry_id: entryId });
  if (error) console.error('retract_like_notification 실패:', error.message);
}

export async function notifyFriendEvent(
  supabase: Supabase,
  recipientId: string,
  type: 'friend_request' | 'friend_accept'
): Promise<void> {
  const { error } = await supabase.rpc('notify_friend_event', {
    p_recipient: recipientId,
    p_type: type,
  });
  if (error) console.error('notify_friend_event 실패:', error.message);
}

/**
 * 친구 요청을 수락/거절한 뒤, 그 요청 때문에 내게 온 friend_request 알림을 지운다.
 * 요청을 취소(cancel)하는 쪽은 상대(수신자) 소유 알림 행을 지울 RPC가 없어 대상이 아니다 —
 * RLS가 recipient(auth.uid() = user_id) 본인의 삭제만 허용하므로, 여기서는 "나"(수신자)가
 * 지울 수 있는 accept/decline 경로에서만 호출한다.
 */
export async function retractFriendRequestNotification(
  supabase: Supabase,
  actorId: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('actor_id', actorId)
    .eq('type', 'friend_request');
  if (error) console.error('retractFriendRequestNotification 실패:', error.message);
}
