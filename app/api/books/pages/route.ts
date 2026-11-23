import { unauthorized } from '@/lib/api/auth';
// app/api/books/pages/route.ts
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { aladinKey, lookupAladin } from '@/lib/books/aladin';
import { asIsbn10, asIsbn13, preferredIsbn } from '@/lib/books/isbn';

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

/** 카카오 isbn 필드('10자리 13자리')든 ISBN 하나든 받아 알라딘에 물을 값 하나로 */
function parseIsbn(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  return asIsbn13(raw) ?? asIsbn10(raw) ?? preferredIsbn(raw);
}

/** 다음 책 정보 페이지의 '페이지수' 칸을 읽는다. 못 읽으면 null */
async function daumPages(url: URL): Promise<number | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const $ = cheerio.load(await res.text());
    const text = $('dt.tit_base:contains("페이지수")')
      .next('dd.cont')
      .clone() // clone to avoid modifying original
      .children()
      .remove()
      .end()
      .text()
      .trim();
    const pages = parseInt(text, 10);
    return Number.isInteger(pages) && pages > 0 ? pages : null;
  } catch {
    return null;
  }
}

/**
 * 고른 책의 전체 쪽수. 다음 책 정보 페이지를 먼저 읽고, 못 읽으면 ISBN으로 알라딘에 묻는다(키가 있을 때만).
 * 둘 다 실패해도 등록은 막지 않는다 — 화면은 쪽수를 비워 두고 독자가 적게 둔다.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const url = parseAllowedUrl(body?.url);
  const isbn = parseIsbn(body?.isbn);
  if (!url && !isbn) {
    return NextResponse.json({ error: '허용되지 않은 주소입니다.' }, { status: 400 });
  }

  const fromDaum = url ? await daumPages(url) : null;
  if (fromDaum) return NextResponse.json({ totalPages: fromDaum, source: 'daum' });

  const key = isbn ? aladinKey() : null;
  const fromAladin = key && isbn ? (await lookupAladin(isbn, key))?.totalPages : null;
  if (fromAladin) return NextResponse.json({ totalPages: fromAladin, source: 'aladin' });

  return NextResponse.json({ error: '페이지 수 추출 실패' }, { status: 404 });
}
