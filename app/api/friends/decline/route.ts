import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { friendUserId } = await req.json(); // 요청 보낸 사람의 user_id

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const myId = user?.id;
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('friends')
    .delete()
    .eq('user_id', friendUserId)
    .eq('friend_id', myId)
    .eq('status', 'pending');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
