// /app/api/friends/accept/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { requestId } = await req.json();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const myId = session?.user.id;
  if (!myId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('friend_id', myId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
