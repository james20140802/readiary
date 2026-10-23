/**
 * 책 한 권 견본 — 데이터를 가져오지 않고 견본 기록으로 표지 위 간지·플래그·원고를 그린다.
 * `?state=finished`(다 읽음), `?state=nototal`(전체 쪽수 모름 — 가장 큰 기록 쪽이 끝), `?state=empty`(기록 없음).
 * 이 화면은 `redesign` → `main` 머지 전에 지운다. 프로덕션 배포에서는 열리지 않는다.
 * 좋아요·고치기 저장은 실제 API를 부르므로 견본에서는 누르지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import LabBookDetail from './LabBookDetail';

export const metadata: Metadata = { title: '책 한 권 견본', robots: { index: false } };

export default async function BookDetailLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  return <LabBookDetail state={state ?? ''} />;
}
