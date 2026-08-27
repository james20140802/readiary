import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFutureKSTDate } from '@/lib/entries/validation';
import { updateProgress } from '@/utils/sync';

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
  if ('is_private' in body) patch.is_private = body.is_private;
  if ('date' in body && body.date) patch.date = body.date;

  if (typeof patch.date === 'string' && isFutureKSTDate(patch.date)) {
    return NextResponse.json({ error: '미래 날짜로는 기록할 수 없습니다.' }, { status: 400 });
  }

  // 페이지 필드가 오면 기존 값과 합친 뒤, 한쪽만 남는 경우 양쪽에 같은 값으로 정규화한다
  // (진행률 RPC와 통계가 한쪽짜리 범위를 따로 다루지 않아도 되도록)
  if ('from_page' in body || 'to_page' in body) {
    const { data: cur } = await supabase
      .from('entries')
      .select('from_page, to_page')
      .eq('id', entry_id)
      .single();
    const nextFrom = 'from_page' in body ? (body.from_page ?? null) : (cur?.from_page ?? null);
    const nextTo = 'to_page' in body ? (body.to_page ?? null) : (cur?.to_page ?? null);
    patch.from_page = nextFrom ?? nextTo;
    patch.to_page = nextTo ?? nextFrom;
  }

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
    // CHECK 제약 위반은 어떤 제약이 걸렸는지에 따라 사용자 메시지를 나눈다
    if (error.code === '23514') {
      const violated = `${error.message} ${error.details ?? ''}`;
      const msg = violated.includes('entries_page_order_check')
        ? '시작 페이지는 종료 페이지보다 작거나 같아야 합니다.'
        : '문장(quote) 또는 생각(note) 중 하나는 필요합니다.';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 페이지가 바뀌면 user_books.last_read_page/progress를 재계산한다 (생성/삭제 경로와 동일)
  if ('from_page' in body || 'to_page' in body) {
    const { data: entryRow } = await supabase
      .from('entries')
      .select('user_books(book_id, user_id)')
      .eq('id', entry_id)
      .single();
    const ub = Array.isArray(entryRow?.user_books) ? entryRow?.user_books[0] : entryRow?.user_books;
    if (ub?.book_id && ub?.user_id) {
      await updateProgress(ub.book_id, ub.user_id);
    }
  }

  return NextResponse.json({ success: true });
}
