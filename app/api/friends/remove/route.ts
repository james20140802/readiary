// /app/api/friends/remove/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { friendId } = await req.json();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const myId = session?.user.id;
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
