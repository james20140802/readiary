import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Supabase = SupabaseClient<Database>;

/**
 * 좋아요·댓글 알림을 만든다. 댓글은 commentId를 넘겨 그 댓글 행에 알림을 매단다 —
 * 댓글이 지워지면 알림도 DB에서 cascade로 함께 사라진다.
 */
export async function notifyEntryEvent(
  supabase: Supabase,
  entryId: string,
  type: 'like' | 'comment',
  commentId?: string
): Promise<void> {
  const { error } = await supabase.rpc('notify_entry_event', {
    p_entry_id: entryId,
    p_type: type,
    ...(commentId ? { p_comment_id: commentId } : {}),
  });
  if (error) console.error('notify_entry_event 실패:', error.message);
}

export async function retractLikeNotification(supabase: Supabase, entryId: string): Promise<void> {
  const { error } = await supabase.rpc('retract_like_notification', { p_entry_id: entryId });
  if (error) console.error('retract_like_notification 실패:', error.message);
}

/** 친구 요청·수락 알림. RPC가 friends 행을 검증하고 그 행에 알림을 매단다(행이 지워지면 알림도 사라진다). */
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
 * 친구 요청을 수락한 뒤, 그 요청 때문에 내게 온 friend_request 알림을 지운다.
 * 수락은 friends 행을 남기므로(status만 accepted) cascade가 돌지 않아 여기서 직접 지운다.
 * 거절·취소·친구 끊기는 friends 행 자체가 지워져 알림도 DB에서 함께 사라진다 — 호출할 필요 없다.
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
