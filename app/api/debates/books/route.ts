import { NextResponse } from 'next/server';
import { debateHeaders } from '@/lib/debate/errors';
import { withSession } from '@/lib/debate/server';

// GET: 발제·근거로 문장을 고를 때 먼저 보여 줄 내 책 — 문장이 하나 이상 있는 책과 그 문장 수.
// 개수는 DB가 센다(문장 행을 내려받지 않는다). 최근에 서재에 들인 책부터.
export async function GET() {
  return withSession(async (supabase, userId) => {
    const { data, error } = await supabase
      .from('user_books')
      .select('id, books(title, author, cover_url), entries!inner(count)')
      .eq('user_id', userId)
      .not('entries.quote', 'is', null)
      .neq('entries.quote', '')
      .order('created_at', { ascending: false })
      .limit(300);
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
    return NextResponse.json(
      rows
        .map((r) => ({
          userBookId: r.id,
          title: r.books?.title ?? '',
          author: r.books?.author ?? null,
          coverUrl: r.books?.cover_url ?? null,
          quoteCount: r.entries?.[0]?.count ?? 0,
        }))
        .filter((b) => b.quoteCount > 0),
      { headers: debateHeaders }
    );
  });
}
