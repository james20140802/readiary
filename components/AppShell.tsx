'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';

interface AppShellProps {
  /** 서버(루트 레이아웃)가 쿠키로 판정한 초기 로그인 여부 — 첫 페인트부터 맞는 GNB를 그린다 */
  initialLoggedIn: boolean;
  /** 서버가 미리 세어 온 안 읽은 알림 개수 — 뱃지가 0에서 시작했다가 켜지는 깜빡임을 없앤다 */
  /** 서버가 미리 센 안 읽은 알림 수 — null은 조회 실패(모름)라 클라이언트 값을 유지한다 */
  initialUnread: number | null;
  children: React.ReactNode;
}

/** 로그인 상태가 있어도 GNB 탭·종을 숨기는 화면 — 온보딩처럼 빠져나갈 수 없거나, 인증 절차 중인 곳 */
const BARE_PREFIXES = [
  '/login',
  '/signup',
  '/onboarding',
  '/auth',
  '/logout',
  '/reset-password',
  '/update-password',
];

/**
 * 앱 셸 — 로그인 여부·알림 뱃지·GNB 표시 여부를 한 곳에서 정하고 Header/Navbar에 내려준다.
 * 로그인 여부는 서버 초기값 + onAuthStateChange 구독으로 로그인·로그아웃 직후 즉시 갱신된다.
 * (예전엔 Header가 마운트 때 한 번만 세션을 읽어 로그아웃 뒤에도 종이 남았다)
 */
export default function AppShell({ initialLoggedIn, initialUnread, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  // 서버 재렌더(router.refresh 등)로 초기값이 바뀌면 따라간다 — 렌더 중 비교(ref·effect 금지)
  const [prevInitial, setPrevInitial] = useState(initialLoggedIn);
  if (prevInitial !== initialLoggedIn) {
    setPrevInitial(initialLoggedIn);
    setLoggedIn(initialLoggedIn);
  }

  useEffect(() => {
    const supabase = createSupabaseClient();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const bare = BARE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const showNav = loggedIn && !bare;
  // 뱃지 조회는 셸에서 한 번만 — 모바일 헤더·데스크톱 바가 같은 값을 나눠 쓴다
  const hasUnread = useUnreadNotifications(showNav, initialUnread);

  // 보호 라우트 프리페치는 로그인한 뒤에만 — 비로그인 방문자가 매번 /login 리다이렉트만 받아오던 낭비
  useEffect(() => {
    if (!showNav) return;
    for (const href of [
      '/protected/dashboard',
      '/protected/books',
      '/protected/social',
      '/protected/profile',
    ]) {
      router.prefetch(href);
    }
  }, [showNav, router]);

  return (
    <>
      <Header loggedIn={loggedIn} showNav={showNav} hasUnread={hasUnread} />
      <Navbar loggedIn={loggedIn} showNav={showNav} hasUnread={hasUnread} />
      {/* 아래 여백은 하단 탭바가 실제로 있을 때만 — 비로그인·온보딩 화면에 빈 76px가 남지 않게 */}
      <main
        className={clsx(
          'mx-auto w-full max-w-screen-md px-4 pt-[4rem] md:pt-[6rem] md:pb-16',
          showNav ? 'pb-[calc(4.75rem+env(safe-area-inset-bottom))]' : 'pb-8'
        )}
      >
        {children}
      </main>
    </>
  );
}
