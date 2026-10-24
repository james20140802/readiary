/**
 * 나·설정 견본 차례. 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 * 프로덕션 배포(VERCEL_ENV=production)에서는 열리지 않는다.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '나·설정 견본', robots: { index: false } };

const LINKS = [
  ['/design-lab/me/profile', '나 — 기록이 쌓인 사람'],
  ['/design-lab/me/profile?state=empty', '나 — 막 가입한 사람(빈 상태)'],
  ['/design-lab/me/profile?state=error', '나 — 숫자·달 요약을 불러오지 못함'],
  ['/design-lab/me/settings', '설정 — 이 기기 알림 꺼짐'],
  ['/design-lab/me/settings?push=on', '설정 — 이 기기 알림 켜짐'],
  ['/design-lab/me/settings?push=loading', '설정 — 알림 설정 불러오는 중'],
] as const;

export default function MeLabIndex() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return (
    <div>
      <h1 className="font-sans text-page-title">나·설정 견본</h1>
      <ul className="mt-6">
        {LINKS.map(([href, label]) => (
          <li key={href} className="border-t border-hairline last:border-b">
            <Link
              href={href}
              className="flex min-h-[54px] items-center font-sans text-[17px] text-ink"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
