import { unauthorized } from '@/lib/api/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasEntryContent, isFutureKSTDate } from '@/lib/entries/validation';
import { updateProgress } from '@/utils/sync';
import { NextResponse } from 'next/server';
import { isEntryRequestId } from '@/lib/entries/saveRequest';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return unauthorized();
    }

    const body = await req.json();
    const { user_book_id, quote, note, from_page, to_page, date, is_private, client_entry_id } =
      body;
    if (client_entry_id !== undefined && !isEntryRequestId(client_entry_id)) {
      return NextResponse.json({ error: '저장 요청이 올바르지 않습니다.' }, { status: 400 });
    }

    if (!user_book_id || !date || !hasEntryContent(quote, note)) {
      return NextResponse.json(
        { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
        { status: 400 }
      );
    }

    if (isFutureKSTDate(date)) {
      return NextResponse.json({ error: '미래 날짜로는 기록할 수 없습니다.' }, { status: 400 });
    }

    if (from_page != null && to_page != null && Number(from_page) > Number(to_page)) {
      return NextResponse.json(
        { error: '시작 페이지는 종료 페이지보다 작거나 같아야 합니다.' },
        { status: 400 }
      );
    }

    // 내 책에만 기록한다 — 본문의 book_id/user_id는 믿지 않고 user_books에서 확인한 값을 쓴다
    const { data: userBook, error: bookError } = await supabase
      .from('user_books')
      .select('id, book_id')
      .eq('id', user_book_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (bookError)
      return NextResponse.json({ error: '책 정보를 확인하지 못했습니다.' }, { status: 503 });
    if (!userBook) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 한쪽 페이지만 입력되면 양쪽에 같은 값을 저장한다 — 진행률(max to_page)·통계(to-from)가
    // 한쪽짜리 범위를 따로 다루지 않아도 되도록 쓰기 시점에 정규화
    const normFrom = from_page ?? to_page ?? null;
    const normTo = to_page ?? from_page ?? null;

    const { data: created, error } = await supabase
      .from('entries')
      .insert({
        ...(client_entry_id ? { id: client_entry_id } : {}),
        user_book_id,
        quote: typeof quote === 'string' && quote.trim() !== '' ? quote.trim() : null,
        note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
        from_page: normFrom,
        to_page: normTo,
        date,
        is_private: is_private ?? false,
      })
      .select('id')
      .single();

    // entries.id의 기존 PK가 동시 요청도 한 행으로 제한한다. UPDATE/upsert로 기존 기록을 덮어쓰지 않는다.
    if (client_entry_id && error?.code === '23505') {
      const { data: existing, error: lookupError } = await supabase
        .from('entries')
        .select('id')
        .eq('id', client_entry_id)
        .eq('user_book_id', user_book_id)
        .maybeSingle();
      if (lookupError)
        return NextResponse.json({ error: '저장 결과를 확인하지 못했습니다.' }, { status: 503 });
      if (!existing)
        return NextResponse.json(
          { error: '이 저장 요청을 확인할 수 없습니다. 내 기록을 확인해 주세요.' },
          { status: 409 }
        );
      // 첫 요청이 insert 뒤 진행률 갱신에서 실패했어도 재시도가 마무리한다.
      await updateProgress(userBook.book_id, user.id);
      return NextResponse.json({ id: existing.id, replayed: true });
    }
    if (error || !created) {
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
    await updateProgress(userBook.book_id, user.id);
    return NextResponse.json({ id: created.id });
  } catch (error) {
    console.error('Unexpected error in POST /api/entries/new:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
