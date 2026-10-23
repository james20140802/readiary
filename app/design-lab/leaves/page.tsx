/**
 * 장 넘김(Leaves)을 확인하는 미리보기 전용 견본. 데이터를 가져오지 않는다.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import LeavesDemo from './LeavesDemo';

export const metadata: Metadata = { title: '장 넘김 견본', robots: { index: false } };

export default function LeavesLabPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <LeavesDemo />;
}
