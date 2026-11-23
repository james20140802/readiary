import { unauthorized } from '@/lib/api/auth';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isbnQuery } from '@/lib/books/isbn';
import type { KakaoBookSearchResponse } from '@/types/kakao';

const KAKAO_BOOK = 'https://dapi.kakao.com/v3/search/book';

export async function GET(req: Request) {
  // 서버가 보관한 카카오 키로 대신 검색하는 라우트 — 로그인한 사용자에게만
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

  if (!query || !KAKAO_REST_API_KEY) {
    return NextResponse.json({ error: 'Missing query or API key' }, { status: 400 });
  }

  // ISBN 하나(바코드·직접 입력)면 ISBN으로만 찾는다. 그 밖에는 대상을 정하지 않아 제목·지은이·출판사를 모두 본다
  const isbn = isbnQuery(query);
  const params = new URLSearchParams({ query: isbn ?? query, size: '10' });
  if (isbn) params.set('target', 'isbn');

  const res = await fetch(`${KAKAO_BOOK}?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: '책을 찾지 못했어요.' }, { status: 502 });
  }
  const data = (await res.json()) as KakaoBookSearchResponse;
  return NextResponse.json({
    ...data,
    documents: Array.isArray(data.documents) ? data.documents : [],
  });
}
