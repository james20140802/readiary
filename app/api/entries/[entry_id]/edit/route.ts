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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const norm = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

  const patch: Record<string, unknown> = {};
  if ('quote' in body) patch.quote = norm(body.quote);
  if ('note' in body) patch.note = norm(body.note);
  if ('from_page' in body) patch.from_page = body.from_page ?? null;
  if ('to_page' in body) patch.to_page = body.to_page ?? null;
  if ('is_private' in body) patch.is_private = body.is_private;
  if ('date' in body && body.date) patch.date = body.date;

  if ('quote' in body && 'note' in body && patch.quote == null && patch.note == null) {
    return NextResponse.json(
      { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
      { status: 400 }
    );
  }

  if (
    patch.from_page != null &&
    patch.to_page != null &&
    Number(patch.from_page) > Number(patch.to_page)
  ) {
    return NextResponse.json(
      { error: '시작 페이지는 종료 페이지보다 작거나 같아야 합니다.' },
      { status: 400 }
    );
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
  }

  const { error } = await supabase.from('entries').update(patch).eq('id', entry_id);

  if (error) {
    // 한쪽 키만 전송되어 CHECK(quote or note) 제약을 어긴 경우
    if (error.code === '23514') {
      return NextResponse.json(
        { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
