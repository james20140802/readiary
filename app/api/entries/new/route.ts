import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateProgress } from '@/utils/sync';
import { NextResponse } from 'next/server';

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

    const body = await req.json();
    const { user_book_id, quote, note, from_page, to_page, date, is_private, book_id, user_id } =
      body;

    const hasContent =
      (typeof quote === 'string' && quote.trim() !== '') ||
      (typeof note === 'string' && note.trim() !== '');

    if (!user_book_id || !date || !hasContent) {
      return NextResponse.json(
        { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
        { status: 400 }
      );
    }

    if (from_page != null && to_page != null && Number(from_page) > Number(to_page)) {
      return NextResponse.json(
        { error: '시작 페이지는 종료 페이지보다 작거나 같아야 합니다.' },
        { status: 400 }
      );
    }

    // 한쪽 페이지만 입력되면 양쪽에 같은 값을 저장한다 — 진행률(max to_page)·통계(to-from)가
    // 한쪽짜리 범위를 따로 다루지 않아도 되도록 쓰기 시점에 정규화
    const normFrom = from_page ?? to_page ?? null;
    const normTo = to_page ?? from_page ?? null;

    const { error } = await supabase.from('entries').insert({
      user_book_id,
      quote: typeof quote === 'string' && quote.trim() !== '' ? quote.trim() : null,
      note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
      from_page: normFrom,
      to_page: normTo,
      date,
      is_private: is_private ?? false,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
    await updateProgress(book_id, user_id);
    return NextResponse.json({ message: 'Entry created successfully' });
  } catch (error) {
    console.error('Unexpected error in POST /api/entries/new:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
