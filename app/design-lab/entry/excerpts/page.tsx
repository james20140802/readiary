/**
 * 발췌집 견본 — 데이터를 가져오지 않는다. 문구는 시안 excerpt.html에서.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ExcerptReader from '@/components/books/ExcerptReader';

export const metadata: Metadata = { title: '발췌집 견본', robots: { index: false } };

const QUOTES = [
  ['q1', '2026-08-30', '사랑에 빠지는 일은 상대를 다 알기 전에 시작된다.'],
  ['q2', '2026-09-02', '오해도 이해의 한 방식이다.'],
  ['q3', '2026-09-09', '우리는 상대를 사랑하는 것이 아니라 상대에 대한 우리의 생각을 사랑한다.'],
  ['q4', '2026-09-14', '함께 있을 때 가장 외로운 순간이 있다.'],
  ['q5', '2026-09-18', '기억은 늘 조금씩 이야기를 고쳐 쓴다.'],
  [
    'q6',
    '2026-09-21',
    '끝은 대개 처음에 이미 적혀 있다.\n다만 우리는 처음을 읽을 때 그것이 끝이라는 걸 모를 뿐이다. 그래서 다시 읽는 일은 처음과 끝을 한꺼번에 읽는 일이 된다.',
  ],
].map(([id, date, quote]) => ({ id, date, quote }));

export default async function ExcerptLabPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const v = (await searchParams).v;
  const quotes = v === 'empty' ? [] : v === 'one' ? QUOTES.slice(0, 1) : QUOTES;
  return (
    <ExcerptReader
      bookTitle="왜 나는 너를 사랑하는가"
      author="알랭 드 보통"
      quotes={quotes}
      entryDates={[...QUOTES.map((q) => q.date), '2026-09-21']}
      bookId="lab-book"
      today="2026-10-06"
    />
  );
}
