/**
 * 책장 견본 — 데이터를 가져오지 않고 견본 데이터로 책장을 그린다.
 * `?state=empty`(빈 책장), `?state=few`(세 권). 이 화면은 `redesign` → `main` 머지 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BooksView from '@/components/books/BooksView';
import { LAB_TODAY, labBooks } from './fixtures';

export const metadata: Metadata = { title: '책장 견본', robots: { index: false } };

export default async function BooksLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const { books, stats } = labBooks();
  const shown = state === 'empty' ? [] : state === 'few' ? books.slice(0, 3) : books;
  return <BooksView books={shown} stats={stats} today={LAB_TODAY} />;
}
