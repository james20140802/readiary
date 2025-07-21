// app/api/books/pages/route.ts
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  const { url } = await req.json();

  const res = await fetch(url);
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
