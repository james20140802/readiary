import { unauthorized } from '@/lib/api/auth';
// /app/api/friends/send/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyFriendEvent } from '@/lib/notifications/notify';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { nickname, tag } = await req.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  if (!userId) return unauthorized();

  // Look up the friend's profile by nickname and tag
  const { data: friendProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .eq('tag', tag)
    .single();

  if (lookupError || !friendProfile) {
    return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
  }

  const friendId = friendProfile.id;

  if (userId === friendId) {
    return NextResponse.json({ error: 'Cannot add yourself as a friend' }, { status: 400 });
  }

  const { error } = await supabase.from('friends').insert({
    user_id: userId,
    friend_id: friendId,
    status: 'pending',
  });

  if (error?.code === '23505') {
    const { data: existing, error: readError } = await supabase
      .from('friends')
      .select('status')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .maybeSingle();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    if (existing?.status === 'pending' || existing?.status === 'accepted') {
      return NextResponse.json({ success: true, status: existing.status, already_exists: true });
    }
    return NextResponse.json({ error: 'Friend request state changed' }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyFriendEvent(supabase, friendId, 'friend_request');

  return NextResponse.json({ success: true });
}
