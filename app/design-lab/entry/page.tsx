/**
 * 기록 한 장 견본 — 지금 주소(/entry)처럼 장 넘김 없이 흐르는 틀에서 본다.
 * 장 넘김 틀에서 보려면 /design-lab/leaves/entry. 데이터를 가져오지 않는다.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import EntryLab from './EntryLab';
import { pickVariant } from './variants';

export const metadata: Metadata = { title: '기록 한 장 견본', robots: { index: false } };

export default async function EntryLabPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const v = (await searchParams).v;
  return <EntryLab variant={pickVariant(v)} />;
}
