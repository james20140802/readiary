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
