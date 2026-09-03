import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  // 서버가 보관한 카카오 키로 대신 검색하는 라우트 — 로그인한 사용자에게만
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

  if (!query || !KAKAO_REST_API_KEY) {
    return NextResponse.json({ error: 'Missing query or API key' }, { status: 400 });
  }

  const res = await fetch(
    `https://dapi.kakao.com/v3/search/book?target=title&query=${encodeURIComponent(query)}&size=10`,
    {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
