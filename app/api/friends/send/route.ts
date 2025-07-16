// /app/api/friends/send/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { friendId } = await req.json();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (userId === friendId) {
    return NextResponse.json({ error: 'Cannot add yourself as a friend' }, { status: 400 });
  }

  const { error } = await supabase.from('friends').insert({
    user_id: userId,
    friend_id: friendId,
    status: 'pending',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
