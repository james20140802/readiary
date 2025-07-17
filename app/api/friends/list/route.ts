// /app/api/friends/list/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { transformFriendRow } from '@/utils/friends';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
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
      user_profile:profiles!user_id (*),
      friend_profile:profiles!friend_id (*)
    `
    )
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const friends = data.map((row) => transformFriendRow(row, userId));

  return NextResponse.json({ friends });
}
