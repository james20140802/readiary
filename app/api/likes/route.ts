import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyEntryEvent, retractLikeNotification } from '@/lib/notifications/notify';
import { NextResponse } from 'next/server';

// 한 기록에 좋아요를 남긴 사람들 — 대출카드 명단
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entry_id');

  if (!entryId) {
    return NextResponse.json({ error: 'entry_id가 필요합니다.' }, { status: 400 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  const { data: likes, error: likesError } = await supabase
    .from('likes')
    .select('user_id, created_at')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true });

  if (likesError) {
    return NextResponse.json({ error: likesError.message }, { status: 500 });
  }
  if (!likes || likes.length === 0) return NextResponse.json([]);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, nickname, tag')
    .in(
      'id',
      likes.map((like) => like.user_id)
    );

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  // 프로필 페이지는 본인·수락된 친구만 열람 가능 — 그 외의 좋아요 명단
  // 행에는 링크를 걸지 않도록 열람 가능 여부를 함께 내려준다
  const { data: friendRows, error: friendsError } = await supabase
    .from('friends')
    .select('user_id, friend_id')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (friendsError) {
    return NextResponse.json({ error: friendsError.message }, { status: 500 });
  }

  const friendIds = new Set(
    (friendRows ?? []).map((row) => (row.user_id === user.id ? row.friend_id : row.user_id))
  );

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const likers = likes.flatMap((like) => {
    const profile = profileMap.get(like.user_id);
    return profile
      ? [
          {
            ...profile,
            liked_at: like.created_at,
            is_accessible: profile.id === user.id || friendIds.has(profile.id),
          },
        ]
      : [];
  });

  return NextResponse.json(likers);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { entryId } = await request.json();

  // 1. 현재 로그인한 유저 정보 가져오기
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  // 2. 이미 좋아요를 눌렀는지 확인
  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('entry_id', entryId)
    .single();

  if (existingLike) {
    // 3. 이미 있다면 삭제 (좋아요 취소)
    const { error: deleteError } = await supabase.from('likes').delete().eq('id', existingLike.id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    await retractLikeNotification(supabase, entryId);

    return NextResponse.json({ message: 'unliked', liked: false });
  } else {
    // 4. 없다면 추가 (좋아요 실행)
    const { error: insertError } = await supabase.from('likes').insert({
      user_id: user.id,
      entry_id: entryId,
    });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await notifyEntryEvent(supabase, entryId, 'like');

    return NextResponse.json({ message: 'liked', liked: true });
  }
}
