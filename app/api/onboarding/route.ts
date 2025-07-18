import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, nickname, tag, bio } = body;

  if (!name || !nickname || !tag) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    name,
    nickname,
    tag,
    bio: bio ?? null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
