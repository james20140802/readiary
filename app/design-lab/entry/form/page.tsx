/**
 * 기록 쓰기·고치기 폼 견본 — 데이터를 가져오거나 저장하지 않는다.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FormLab from './FormLab';

export const metadata: Metadata = { title: '기록 폼 견본', robots: { index: false } };

export default function FormLabPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <FormLab />;
}
