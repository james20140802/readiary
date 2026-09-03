'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

/** 알림을 읽음 처리한 쪽이 쏘는 신호 — 뱃지 인스턴스들이 듣고 즉시 다시 센다 */
export const NOTIFICATIONS_READ_EVENT = 'readiary:notifications-read';

/**
 * 안 읽은 알림 존재 여부(뱃지) — 경로 이동뿐 아니라 탭 복귀·창 포커스,
 * 읽음 처리 신호(NOTIFICATIONS_READ_EVENT), 그리고 보이는 동안 60초 주기로
 * 다시 세어, 열어 둔 채 쓰는 웹앱에서도 뱃지가 스스로 켜지고 꺼진다.
 *
 * initialUnread는 루트 레이아웃이 서버에서 미리 세어 내려준 값 — 첫 페인트부터
 * 맞는 상태로 그려서, 0에서 시작했다가 클라이언트 조회 후 켜지는 깜빡임을 없앤다.
 */
export function useUnreadNotifications(enabled: boolean, initialUnread = 0) {
  const [hasUnread, setHasUnread] = useState(initialUnread > 0);
  // 서버 재렌더로 초기값이 바뀌면 따라간다 — 렌더 중 비교(AppShell의 prevInitial과 동일 패턴)
  const [prevInitialUnread, setPrevInitialUnread] = useState(initialUnread);
  if (prevInitialUnread !== initialUnread) {
    setPrevInitialUnread(initialUnread);
    setHasUnread(initialUnread > 0);
  }
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    const supabase = createSupabaseClient();
    let cancelled = false;

    const check = () => {
      if (document.visibilityState !== 'visible') return;
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
        .then(({ count, error }) => {
          if (!cancelled && !error) setHasUnread((count ?? 0) > 0);
        });
    };

    check();
    const id = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, check);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, check);
    };
  }, [pathname, enabled]);

  return hasUnread;
}
