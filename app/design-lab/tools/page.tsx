/**
 * 찾기·알림·인증·공유(도구 화면) 견본 차례. 데이터를 가져오지 않는다.
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { labGuard, LAB_ROBOTS } from './guard';

export const metadata: Metadata = { title: '도구 화면 견본', robots: LAB_ROBOTS };

const LINKS: { href: string; label: string }[] = [
  { href: '/design-lab/tools/search', label: '찾기 · 결과' },
  { href: '/design-lab/tools/search?state=loading', label: '찾기 · 찾는 중' },
  { href: '/design-lab/tools/search?state=error', label: '찾기 · 실패' },
  { href: '/design-lab/tools/search?state=empty', label: '찾기 · 없음' },
  { href: '/design-lab/tools/search?state=idle', label: '찾기 · 입력 전' },
  { href: '/design-lab/tools/weekly', label: '이번 주의 기록' },
  { href: '/design-lab/tools/weekly?state=empty', label: '이번 주의 기록 · 빈 주' },
  { href: '/design-lab/tools/weekly?state=failed', label: '이번 주의 기록 · 실패' },
  { href: '/design-lab/tools/share', label: '공유받은 문장 · 문장+생각' },
  { href: '/design-lab/tools/share?variant=quote', label: '공유받은 문장 · 문장만' },
  { href: '/design-lab/tools/share?variant=note', label: '공유받은 문장 · 생각만' },
  { href: '/design-lab/tools/invite', label: '초대(비로그인)' },
  { href: '/design-lab/tools/not-found', label: '없는 주소' },
  { href: '/login', label: '실제 로그인 화면(비로그인 확인용)' },
  { href: '/signup', label: '실제 가입 화면' },
  { href: '/reset-password', label: '실제 비밀번호 찾기' },
  { href: '/update-password', label: '실제 새 비밀번호(링크 없이 → 막힘 상태)' },
  { href: '/terms', label: '실제 이용 약관' },
  { href: '/privacy', label: '실제 개인정보처리방침' },
];

export default function ToolsLabPage() {
  labGuard();
  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="font-sans text-page-title text-ink">도구 화면 견본</h1>
      <p className="mt-2 font-sans text-caption text-ink-sub">
        고정 예시 데이터로 그린 화면입니다. 인증 화면과 약관은 실제 주소를 비로그인으로 엽니다.
      </p>
      <ul className="mt-6">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-12 items-center border-t border-hairline font-sans text-body text-ink"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
