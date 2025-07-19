import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { nickname, tag } = await req.json();
  console.log(nickname, tag);
  if (!nickname || !tag) {
    return NextResponse.json({ error: 'Invalid nickname or tag' }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. 해당 유저 찾기
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('nickname', nickname)
    .eq('tag', String(tag))
    .single();

  if (profileError || !profiles) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 2. 이미 친구인지 확인
  const { data: friends } = await supabase
    .from('friends')
    .select('*')
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${profiles.id}),and(user_id.eq.${profiles.id},friend_id.eq.${user.id})`
    );

  const isFriend = friends
    ? friends.some(
        (f) =>
          (f.user_id === user.id && f.friend_id === profiles.id) ||
          (f.user_id === profiles.id && f.friend_id === user.id)
      )
    : false;

  return NextResponse.json({ profile: profiles, isFriend });
}
