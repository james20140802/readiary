/**
 * '나' 화면 견본 — 실제 데이터 없이 시안 문구로 그린다. ?state=empty|error 로 빈 상태·오류 상태.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MeView from '@/components/profile/MeView';
import { ME_EMPTY, ME_ERROR, ME_FULL } from '../fixtures';

export const metadata: Metadata = { title: '나 견본', robots: { index: false } };

export default async function MeLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const props = state === 'empty' ? ME_EMPTY : state === 'error' ? ME_ERROR : ME_FULL;
  return <MeView {...props} />;
}
