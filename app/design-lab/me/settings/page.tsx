/**
 * 설정 견본 — 실제 저장·불러오기 없이 시안 문구로 그린다. ?push=on|loading 로 알림 상태.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SettingsLab from './SettingsLab';

export const metadata: Metadata = { title: '설정 견본', robots: { index: false } };

export default async function SettingsLabPage({
  searchParams,
}: {
  searchParams: Promise<{ push?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { push } = await searchParams;
  return <SettingsLab pushState={push === 'on' ? 'on' : push === 'loading' ? 'loading' : 'off'} />;
}
