'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { createSupabaseClient } from '@/lib/supabase/client';
import { sweepLegacyPrivateCaches } from '@/lib/pwa/clear-caches';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { setSearchOwner } from '@/lib/search/memory';
import { readComposerDraft, clearComposerDraft } from '@/lib/entries/composerDraft';
import RuledPaper from '@/components/ui/RuledPaper';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import { TopBar } from '@/components/shell/TopBar';
import { TabBar } from '@/components/shell/TabBar';
import { Sidebar } from '@/components/shell/Sidebar';
import { frameFor, ruledFor, showsNav, type Frame } from '@/lib/shell/routes';

interface AppShellProps {
  /** 서버(루트 레이아웃)가 쿠키로 판정한 초기 로그인 여부 — 첫 페인트부터 맞는 GNB를 그린다 */
  initialLoggedIn: boolean;
  /** Optional badge seed; null lets the client resolve it without blocking the page. */
  initialUnread: number | null;
  children: React.ReactNode;
}

/**
 * 앱 셸 — 로그인 여부·알림 뱃지·메뉴 표시 여부를 한 곳에서 정하고 상단 바·탭 바·사이드바에 내려준다.
 * 로그인 여부는 서버 초기값 + onAuthStateChange 구독으로 로그인·로그아웃 직후 즉시 갱신된다.
 * (예전엔 헤더가 마운트 때 한 번만 세션을 읽어 로그아웃 뒤에도 종이 남았다)
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
      setSearchOwner(session?.user.id ?? null);
      if (!session) clearComposerDraft();
      else {
        try {
          readComposerDraft(sessionStorage, session.user.id);
        } catch {
          /* Storage unavailable. */
        }
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // 캐시 규칙을 바꾸기 전에 설치된 기기에 남은 옛 비공개 캐시(로그인 뒤 화면·API 응답)를 한 번 비운다
  useEffect(() => {
    void sweepLegacyPrivateCaches();
  }, []);

  const frame = frameFor(pathname);
  const nav = showsNav(frame, loggedIn, pathname);
  const ruled = ruledFor(frame);
  const dataNav = loggedIn && nav; // 견본(/design-lab)은 비로그인에도 메뉴를 보이지만 데이터는 묻지 않는다
  // 뱃지 조회는 셸에서 한 번만 — 모바일 상단 바·데스크톱 사이드바가 같은 값을 나눠 쓴다
  const hasUnread = useUnreadNotifications(dataNav, initialUnread);

  // 보호 라우트 프리페치는 로그인한 뒤에만 — 비로그인 방문자가 매번 /login 리다이렉트만 받아오던 낭비
  useEffect(() => {
    if (!dataNav) return;
    for (const href of ['/today', '/books', '/social', '/profile']) {
      router.prefetch(href);
    }
  }, [dataNav, router]);

  return (
    <TopBarProvider>
      {ruled && <RuledPaper variant={ruled} besideSidebar={nav} />}
      {nav && (frame === 'plain' || frame === 'leaves' || frame === 'feed') && (
        <TopBar hasUnread={hasUnread} />
      )}
      {nav && <Sidebar hasUnread={hasUnread} prefetch={dataNav} />}
      {/* w-full을 주지 않는다 — 블록은 사이드바 여백(ml)을 뺀 폭을 스스로 채운다. w-full이면 폭 100%에 여백이 더해져 오른쪽이 화면 밖으로 밀린다 */}
      <main className={clsx('relative', mainClass(frame, nav))}>
        {frame === 'plain' || frame === 'feed' ? (
          <div
            className={clsx(
              'mx-auto w-full',
              frame === 'feed' ? 'lg:max-w-[1400px]' : 'lg:max-w-[860px]'
            )}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </main>
      {/* fixed라 화면은 같고, 키보드 순서는 본문 다음이 되도록 main 뒤에 둔다 */}
      {nav && <TabBar prefetch={dataNav} />}
    </TopBarProvider>
  );
}

/** 틀마다 본문 여백 — 랜딩은 장이 직접 잡고, 간지 틀은 모바일에서 장이 맡는다 */
function mainClass(frame: Frame, nav: boolean): string {
  switch (frame) {
    case 'landing':
      return '';
    case 'bare':
      return 'mx-auto max-w-[1100px] px-6 pt-[calc(12px+var(--app-safe-top))] pb-[calc(48px+var(--app-safe-bottom))]';
    case 'leaves':
      return nav ? 'lg:ml-[var(--app-side)]' : '';
    case 'plain':
    case 'feed':
      return clsx(
        'px-6 pt-[calc(64px+var(--app-safe-top))] lg:pb-16 lg:pl-20 lg:pr-14 lg:pt-11',
        nav
          ? 'pb-[calc(var(--app-tabbar-h)+48px+var(--app-safe-bottom))] lg:ml-[var(--app-side)]'
          : 'pb-[calc(48px+var(--app-safe-bottom))] lg:ml-0'
      );
  }
}
