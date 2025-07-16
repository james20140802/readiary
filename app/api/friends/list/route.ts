// /app/api/friends/list/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('friends')
    .select(
      `
      id,
      user_id,
      friend_id,
      status,
      accepted_at,
      profiles:user_id (nickname, tag),
      target:friend_id (nickname, tag)
    `
    )
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ friends: data });
}
