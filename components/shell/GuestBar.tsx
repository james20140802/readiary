'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { BookMarked } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';
import Button from '@/components/ui/Button';

/** 비로그인 방문자의 랜딩 상단 바 — 로고와 로그인·시작하기. 랜딩 재작성 PR이 대체한다. */
export function GuestBar() {
  const pathname = usePathname();

  return (
    <header className="fixed left-0 top-0 z-50 flex h-[var(--app-mobile-header-height)] w-full items-center justify-between border-b border-hairline bg-paper/90 px-4 pt-[var(--app-safe-top)] backdrop-blur-md">
      {/* 로그인 전에는 앱 화면을 미리 받아오지 않는다 — proxy 의 리다이렉트 결과가 라우터 캐시에 남는다 */}
      <Link href="/" className="flex items-center space-x-2" prefetch={false}>
        <BookMarked size={24} />
        <span className="font-serif text-section-title font-bold tracking-wide">Readiary</span>
      </Link>
      {/* redirect 파라미터를 읽는 쪽만 Suspense 로 감싸 정적 프리렌더를 막지 않는다 */}
      <Suspense fallback={<GuestAuthLinks pathname={pathname} redirectParam={null} />}>
        <GuestAuthLinksWithRedirect pathname={pathname} />
      </Suspense>
    </header>
  );
}

/** 초대 등에서 온 방문자가 로그인↔가입을 오가도 복귀 경로(redirect)를 잃지 않도록 링크에도 싣는다 */
function GuestAuthLinksWithRedirect({ pathname }: { pathname: string }) {
  const redirectParam = useSearchParams().get('redirect');
  return <GuestAuthLinks pathname={pathname} redirectParam={redirectParam} />;
}

function GuestAuthLinks({
  pathname,
  redirectParam,
}: {
  pathname: string;
  redirectParam: string | null;
}) {
  return (
    <div className="flex items-center gap-1">
      {pathname !== '/login' && (
        <Link
          href={authHrefWithRedirect('/login', redirectParam)}
          className="rounded-md px-3 py-1 text-ink-sub transition hover:bg-card-raised hover:text-ink"
        >
          로그인
        </Link>
      )}
      {pathname !== '/signup' && (
        <Button asChild size="sm" className="ml-1">
          <Link href={authHrefWithRedirect('/signup', redirectParam)}>시작하기</Link>
        </Button>
      )}
    </div>
  );
}
