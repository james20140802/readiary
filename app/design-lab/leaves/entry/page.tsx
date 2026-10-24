/**
 * 기록 한 장 견본 — 장 넘김 틀(/design-lab/leaves 아래라 'leaves' 틀이 깔린다)에서 본다.
 * 실제 /entry 주소도 장 넘김 틀 목록(lib/shell/routes.ts LEAVES_ROUTES)에 들어가면 이 모습이 된다.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import EntryLab from '../../entry/EntryLab';
import { pickVariant } from '../../entry/variants';

export const metadata: Metadata = { title: '기록 한 장 견본(장 넘김)', robots: { index: false } };

export default async function EntryLeavesLabPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const v = (await searchParams).v;
  return <EntryLab variant={pickVariant(v)} />;
}
