import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseSearchRequest } from '@/lib/search/request';
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };
// POST keeps private search expressions out of URLs and ordinary access logs.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 4096) throw new Error('검색 조건이 너무 깁니다.');
    input = parseSearchRequest(JSON.parse(raw));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof SyntaxError
            ? '검색 조건을 확인해 주세요.'
            : error instanceof Error
              ? error.message
              : '검색 조건을 확인해 주세요.',
      },
      { status: 400, headers }
    );
  }
  const { data, error } = await supabase.rpc('search_library', {
    p_query: input.query,
    p_kind: input.kind,
    p_book_id: input.bookId || undefined,
    p_from: input.from || undefined,
    p_to: input.to || undefined,
    p_cursor: input.cursor ? { ...input.cursor } : undefined,
  });
  if (error)
    return NextResponse.json(
      { error: '검색 결과를 불러오지 못했습니다. 다시 시도해 주세요.' },
      { status: 500, headers }
    );
  return NextResponse.json(data, { headers });
}
