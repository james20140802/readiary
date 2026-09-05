'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { Bell, BookMarked, Home, LibraryBig, Globe, UserRound } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';
import clsx from 'clsx';
import Button from '@/components/ui/Button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** href 외에 이 탭으로 치는 경로 접두사 — 기록 상세·수정은 책의 일부라 "내 책" */
  also?: string[];
}

const navItems: NavItem[] = [
  { href: '/protected/dashboard', label: '홈', icon: <Home size={20} strokeWidth={1.75} /> },
  {
    href: '/protected/books',
    label: '내 책',
    icon: <LibraryBig size={20} strokeWidth={1.75} />,
    also: ['/protected/entry'],
  },
  { href: '/protected/social', label: '소셜', icon: <Globe size={20} strokeWidth={1.75} /> },
  { href: '/protected/profile', label: '프로필', icon: <UserRound size={20} strokeWidth={1.75} /> },
];

const startsWithPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

const isActive = (pathname: string, item: NavItem) =>
  startsWithPath(pathname, item.href) || (item.also ?? []).some((p) => startsWithPath(pathname, p));

interface NavbarProps {
  loggedIn: boolean;
  showNav: boolean;
  hasUnread: boolean;
}

/** 모바일 하단 탭바 + 데스크톱 상단 바. 로그인 여부·뱃지는 AppShell이 내려준다 */
export default function Navbar({ loggedIn, showNav, hasUnread }: NavbarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Bottom Navbar — 홈 인디케이터 영역만큼 아래 여백(safe-area) */}
      {showNav && (
        <nav
          aria-label="주요 메뉴"
          className="fixed inset-x-0 bottom-0 z-50 block border-t border-hairline bg-paper/90 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden"
        >
          <div className="mx-auto flex max-w-screen-md justify-around text-xs">
            {navItems.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex min-w-[44px] flex-col items-center gap-1 px-2 py-1 transition',
                    active ? 'font-semibold text-accent' : 'text-ink-sub'
                  )}
                  prefetch
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Desktop Top Navbar */}
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 top-0 z-50 hidden border-b border-hairline bg-paper/90 px-8 py-5 backdrop-blur-md md:flex"
      >
        <div className="mx-auto flex w-full max-w-screen-md items-center justify-between text-sm text-ink-sub">
          {/* Header 의 로고와 같은 이유로 GNB 가 보일 때만 프리페치 (온보딩 등 bare 화면 제외) */}
          <Link
            href={loggedIn ? '/protected/dashboard' : '/'}
            className="flex items-center gap-2 font-serif text-lg font-bold tracking-wide text-ink"
            prefetch={showNav}
          >
            <BookMarked size={20} />
            Readiary
          </Link>
          {showNav && (
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-2 rounded-md px-3 py-1 transition hover:bg-card-raised',
                      active ? 'font-semibold text-ink' : 'text-ink-faint'
                    )}
                    prefetch
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}

              {/* 알림 종 — 데스크톱에서는 전역 크롬에 상주 (모바일은 Header가 담당) */}
              <Link
                href="/protected/social/notifications"
                className={clsx(
                  'relative flex items-center rounded-md px-2.5 py-1.5 transition hover:bg-card-raised',
                  pathname === '/protected/social/notifications' ? 'text-ink' : 'text-ink-faint'
                )}
                aria-label="알림"
              >
                <Bell size={20} strokeWidth={1.75} />
                {hasUnread && (
                  <span className="absolute right-1.5 top-1 h-[7px] w-[7px] rounded-full bg-accent">
                    <span className="sr-only">읽지 않은 알림 있음</span>
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* 비로그인 방문자 — 로고만 있던 오른쪽에 로그인·시작하기. 지금 있는 화면의 것은 뺀다.
              redirect 파라미터를 읽는 쪽만 Suspense 로 감싸 정적 프리렌더(/login 등)를 막지 않는다 */}
          {!loggedIn && (
            <Suspense fallback={<GuestAuthLinks pathname={pathname} redirectParam={null} />}>
              <GuestAuthLinksWithRedirect pathname={pathname} />
            </Suspense>
          )}
        </div>
      </nav>
    </>
  );
}

/** 초대 등에서 온 방문자가 로그인↔가입을 오가도 복귀 경로(redirect)를 잃지 않도록 GNB 링크에도 싣는다 */
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
