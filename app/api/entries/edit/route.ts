import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    entry_id,
    summary,
    from_page,
    to_page,
    is_private,
  }: {
    entry_id: string;
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
