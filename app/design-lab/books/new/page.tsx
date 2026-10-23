/**
 * 책 등록 견본 — 검색·저장을 부르지 않고 시안 book-new.html의 상태를 그린다.
 * `?state=manual`(직접 적기), `?state=empty`(검색 결과 없음). 이 화면은 `redesign` → `main` 머지 전에 지운다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import LabBookNew from './LabBookNew';

export const metadata: Metadata = { title: '책 등록 견본', robots: { index: false } };

export default async function BookNewLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  return <LabBookNew state={state ?? ''} />;
}
