// /app/api/friends/accept/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyFriendEvent, retractFriendRequestNotification } from '@/lib/notifications/notify';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { friendId } = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const myId = user?.id;
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('friends')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('user_id', friendId)
    .eq('friend_id', myId)
    .eq('status', 'pending')
    .select();

  if (!error && data.length === 0) {
    return NextResponse.json(
      { error: 'No matching pending friend request found' },
      { status: 400 }
    );
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 수락했으니 내게 온 friend_request 알림을 지우고, 상대에게 수락 알림을 새로 보낸다
  await retractFriendRequestNotification(supabase, friendId);
  await notifyFriendEvent(supabase, friendId, 'friend_accept');

  return NextResponse.json({ success: true });
}
