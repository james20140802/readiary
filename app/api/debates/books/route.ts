import { NextResponse } from 'next/server';
import { badRequest, debateHeaders } from '@/lib/debate/errors';
import { withSession } from '@/lib/debate/server';

const PAGE = 30;

/** ilike 패턴의 특수문자를 글자 그대로 찾도록 */
const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET: 발제·근거로 문장을 고를 때 먼저 보여 줄 내 책 한 쪽 — 문장이 하나 이상 있는 책과 그 문장 수.
// ?q=책 제목 검색어, ?page=0부터. 개수는 DB가 센다(문장 행을 내려받지 않는다). 최근에 서재에 들인 책부터.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const page = Number(url.searchParams.get('page') ?? 0);
  if (!Number.isInteger(page) || page < 0 || page > 500)
    return badRequest('목록 위치를 확인해 주세요.');

  return withSession(async (supabase, userId) => {
    let query = supabase
      .from('user_books')
      .select('id, books!inner(title, author, cover_url), entries!inner(count)')
      .eq('user_id', userId)
      .not('entries.quote', 'is', null)
      .neq('entries.quote', '');
    if (q) query = query.ilike('books.title', `%${escapeLike(q)}%`);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE);
    if (error) {
      console.error('Debate books failed:', error.code);
      return NextResponse.json(
        { error: '책을 불러오지 못했어요.' },
        { status: 500, headers: debateHeaders }
      );
    }
    const rows = (data ?? []) as unknown as Array<{
      id: string;
      books: { title: string; author: string | null; cover_url: string | null } | null;
      entries: Array<{ count: number }> | null;
    }>;
    const items = rows
      .slice(0, PAGE)
      .map((r) => ({
        userBookId: r.id,
        title: r.books?.title ?? '',
        author: r.books?.author ?? null,
        coverUrl: r.books?.cover_url ?? null,
        quoteCount: r.entries?.[0]?.count ?? 0,
      }))
      .filter((b) => b.quoteCount > 0);
    return NextResponse.json(
      { items, next: rows.length > PAGE ? page + 1 : null },
      { headers: debateHeaders }
    );
  });
}
