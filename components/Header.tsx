'use client';

import Link from 'next/link';
import { Bell, BookMarked } from 'lucide-react';

interface HeaderProps {
  loggedIn: boolean;
  /** 탭·종을 보여도 되는 화면인지 (로그인 + 온보딩·인증 화면 아님) */
  showNav: boolean;
  hasUnread: boolean;
}

/** 모바일 전역 상단 헤더 — 로고와 알림 종. 데스크톱은 Navbar의 상단 바가 담당(md:hidden) */
export default function Header({ loggedIn, showNav, hasUnread }: HeaderProps) {
  return (
    <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-hairline bg-paper/90 px-4 py-3 backdrop-blur-md md:hidden">
      {/* 프리페치는 GNB가 보이는 화면에서만 — 온보딩처럼 프로필이 아직 없는 화면에서 /protected 를 미리
          받아오면 proxy 가 /onboarding 으로 돌려보낸 결과가 라우터 캐시에 5분간 남아, 프로필을 만든 뒤
          router.push('/protected/dashboard') 가 서버에 가지 않고 온보딩 화면을 다시 그린다 */}
      <Link
        href={loggedIn ? '/protected/dashboard' : '/'}
        className="flex items-center space-x-2"
        prefetch={showNav}
      >
        <BookMarked size={24} />
        <span className="font-serif text-lg font-bold tracking-wide">Readiary</span>
      </Link>

      {/* 알림 종 — 모바일은 전역 상단 헤더에 상주. 터치 영역 44px */}
      {showNav && (
        <Link
          href="/protected/social/notifications"
          className="relative -mr-3 p-3 text-ink-sub"
          aria-label="알림"
        >
          <Bell size={20} strokeWidth={1.75} />
          {hasUnread && (
            <span className="absolute right-2.5 top-2.5 h-[7px] w-[7px] rounded-full bg-accent">
              <span className="sr-only">읽지 않은 알림 있음</span>
            </span>
          )}
        </Link>
      )}
    </header>
  );
}
