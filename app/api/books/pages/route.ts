// app/api/books/pages/route.ts
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** 카카오 책 검색 결과의 상세 링크만 받는다 — 임의 URL을 서버가 대신 열어주면 SSRF가 된다 */
const ALLOWED_HOSTS = new Set(['search.daum.net']);

function parseAllowedUrl(raw: unknown): URL | null {
  if (typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const url = parseAllowedUrl(body?.url);
  if (!url) {
    return NextResponse.json({ error: '허용되지 않은 주소입니다.' }, { status: 400 });
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const html = await res.text();
  const $ = cheerio.load(html);

  const text = $('dt.tit_base:contains("페이지수")')
    .next('dd.cont')
    .clone() // clone to avoid modifying original
    .children()
    .remove()
    .end()
    .text()
    .trim();
  const totalPages = parseInt(text, 10);

  if (isNaN(totalPages)) {
    return NextResponse.json({ error: '페이지 수 추출 실패' }, { status: 400 });
  }

  return NextResponse.json({ totalPages });
}
