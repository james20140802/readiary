// /app/api/friends/remove/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isUuid } from '@/lib/share/validation';

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { friendId } = await req.json();
  // or() 필터 문자열에 그대로 끼워 넣으므로 UUID가 아니면 거절한다
  if (typeof friendId !== 'string' || !isUuid(friendId)) {
    return NextResponse.json({ error: 'friendId가 올바르지 않습니다.' }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const myId = user?.id;
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('friends')
    .delete()
    .or(
      `and(user_id.eq.${myId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${myId})`
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
