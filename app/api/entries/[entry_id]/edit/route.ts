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
    summary,
    from_page,
    to_page,
    is_private,
  }: {
    summary: string;
    from_page: number;
    to_page: number;
    is_private: boolean;
  } = await req.json();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('entries')
    .update({
      summary,
      from_page,
      to_page,
      is_private,
    })
    .eq('id', entry_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
