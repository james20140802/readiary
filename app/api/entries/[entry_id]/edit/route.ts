import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entry_id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const entry_id = (await params).entry_id;

  if (!entry_id) {
    return NextResponse.json({ error: 'entry_id 필요합니다.' }, { status: 400 });
  }

  const {
    quote,
    note,
    from_page,
    to_page,
    is_private,
  }: {
    quote?: string | null;
    note?: string | null;
    from_page?: number | null;
    to_page?: number | null;
    is_private?: boolean;
  } = await req.json();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasContent =
    (typeof quote === 'string' && quote.trim() !== '') ||
    (typeof note === 'string' && note.trim() !== '');

  if (!hasContent) {
    return NextResponse.json(
      { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('entries')
    .update({
      quote: typeof quote === 'string' && quote.trim() !== '' ? quote.trim() : null,
      note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
      from_page: from_page ?? null,
      to_page: to_page ?? null,
      is_private,
    })
    .eq('id', entry_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
