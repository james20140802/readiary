import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { name, nickname, tag, bio } = body;

    if (!name || !nickname || !tag) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name,
        nickname,
        tag,
        bio: bio ?? null,
      })
      .select('*')
      .single();

    if (!data || insertError) {
      const errorMessage = insertError.message ?? 'Insert failed';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
