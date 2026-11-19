import { NextResponse } from 'next/server';
import { badRequest, debateHeaders } from '@/lib/debate/errors';
import { withSession } from '@/lib/debate/server';
import { isUuid } from '@/lib/share/validation';

const PAGE = 20;

/** ilike 패턴의 특수문자를 글자 그대로 찾도록 */
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET: 발제·근거로 고를 수 있는 내 기록(문장이 있는 것) 한 쪽. ?q=문장 검색어, ?book=내 책(user_book) id, ?page=0부터.
// 나만 보기 기록도 포함한다(고르는 순간 토론에 함께 남는다고 화면이 알린다).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const page = Number(url.searchParams.get('page') ?? 0);
  if (!Number.isInteger(page) || page < 0 || page > 500)
    return badRequest('목록 위치를 확인해 주세요.');
  const book = url.searchParams.get('book');
  if (book !== null && !isUuid(book)) return badRequest('책을 확인해 주세요.');

  return withSession(async (supabase, userId) => {
    let query = supabase
      .from('entries')
      .select(
        'id, quote, date, from_page, is_private, user_books!inner(user_id, books(title, author))'
      )
      .eq('user_books.user_id', userId)
      .not('quote', 'is', null)
      .neq('quote', '');
    if (book) query = query.eq('user_book_id', book.toLowerCase());
    if (q) query = query.ilike('quote', `%${escapeLike(q)}%`);
    const { data, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE);
    if (error) {
      console.error('Debate entries failed:', error.code);
      return NextResponse.json(
        { error: '기록을 불러오지 못했어요.' },
        { status: 500, headers: debateHeaders }
      );
    }
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      quote: string;
      date: string;
      from_page: number | null;
      is_private: boolean;
      user_books: { books: { title: string; author: string | null } | null } | null;
    }>;
    const items = rows.slice(0, PAGE).map((r) => ({
      id: r.id,
      quote: r.quote,
      date: r.date,
      pageFrom: r.from_page,
      isPrivate: r.is_private,
      bookTitle: r.user_books?.books?.title ?? '',
      bookAuthor: r.user_books?.books?.author ?? null,
    }));
    return NextResponse.json(
      { items, next: rows.length > PAGE ? page + 1 : null },
      { headers: debateHeaders }
    );
  });
}
