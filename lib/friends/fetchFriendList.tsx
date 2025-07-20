import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Friend } from '@/types/friends';
import { transformFriendRow } from '@/utils/friends';

export async function fetchFriendList(): Promise<Friend[] | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return [];
  }

  const { data, error } = await supabase
    .from('friends')
    .select(
      `
      id,
      user_id,
      friend_id,
      status,
      accepted_at,
      user_profile:profiles!user_id (*),
      friend_profile:profiles!friend_id (*)
    `
    )
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error || !data) return null;

  const friends = data.map((row) => transformFriendRow(row, user.id));

  return friends;
}

export async function fetchSentFriendRequests(): Promise<Friend[] | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return [];
  }

  const { data, error } = await supabase
    .from('friends')
    .select(
      `
      id,
      user_id,
      friend_id,
      status,
      accepted_at,
      user_profile:profiles!user_id (*),
      friend_profile:profiles!friend_id (*)
    `
    )
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error || !data) return null;

  const friends = data.map((row) => transformFriendRow(row, user.id));

  return friends;
}

export async function fetchReceivedFriendRequests(): Promise<Friend[] | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return [];
  }

  const { data, error } = await supabase
    .from('friends')
    .select(
      `
      id,
      user_id,
      friend_id,
      status,
      accepted_at,
      user_profile:profiles!user_id (*),
      friend_profile:profiles!friend_id (*)
    `
    )
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (error || !data) return null;

  const friends = data.map((row) => transformFriendRow(row, user.id));

  return friends;
}
