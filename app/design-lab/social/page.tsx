/**
 * 소셜(친구의 문장) 견본 — 데이터를 가져오지 않고 예시 데이터로 그린다.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FeedLab from './FeedLab';

export const metadata: Metadata = { title: '소셜 견본', robots: { index: false } };

export default async function SocialLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  return <FeedLab state={state} />;
}
