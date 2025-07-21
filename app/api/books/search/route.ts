import { NextResponse } from 'next/server';

export async function GET(req: Request) {
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
