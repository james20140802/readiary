'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 서버 컴포넌트 데이터를 살아 있게 유지한다 — 탭이 다시 보이거나 창이
 * 포커스될 때, 그리고 보이는 동안 intervalMs마다 router.refresh()로
 * 서버 데이터를 다시 받는다. 웹앱처럼 오래 열어 두는 화면(친구 요청 등)에
 * 새로고침 없이 변경이 반영되게 한다.
 */
export function useLiveRefresh(intervalMs = 60_000) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      router.refresh();
    };

    const id = window.setInterval(refresh, intervalMs);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [router, intervalMs]);
}
