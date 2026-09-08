'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushDatabase } from '@/lib/push/types';
import { createSupabaseClient } from '@/lib/supabase/client';

/** 알림을 읽음 처리한 쪽이 쏘는 신호 — 뱃지 인스턴스들이 듣고 즉시 다시 센다 */
export const NOTIFICATIONS_READ_EVENT = 'readiary:notifications-read';

/**
 * 안 읽은 알림 존재 여부(뱃지) — 경로 이동뿐 아니라 탭 복귀·창 포커스,
 * 읽음 처리 신호(NOTIFICATIONS_READ_EVENT), 그리고 보이는 동안 60초 주기로
 * 다시 세어, 열어 둔 채 쓰는 웹앱에서도 뱃지가 스스로 켜지고 꺼진다.
 *
 * initialUnread는 선택적 서버 초기값. 루트는 본문을 막지 않도록 null을 보내며
 * hydration 뒤 RPC 한 번으로 두 종류의 알림 유무를 확인한다.
 * null은 서버 조회 실패(모름) — 그때는 클라이언트가 세어 둔 값을 그대로 둔다.
 */
export function useUnreadNotifications(enabled: boolean, initialUnread: number | null = 0) {
  const [hasUnread, setHasUnread] = useState((initialUnread ?? 0) > 0);
  // 서버 재렌더로 초기값이 바뀌면 따라간다 — 렌더 중 비교(AppShell의 prevInitial과 동일 패턴).
  // 단 null(실패)은 권위 있는 값이 아니므로 기존 상태를 덮어쓰지 않는다.
  const [prevInitialUnread, setPrevInitialUnread] = useState(initialUnread);
  if (prevInitialUnread !== initialUnread) {
    setPrevInitialUnread(initialUnread);
    if (initialUnread !== null) setHasUnread(initialUnread > 0);
  }
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    const supabase = createSupabaseClient() as unknown as SupabaseClient<PushDatabase>;
    let cancelled = false;

    const check = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.rpc('has_unread_notifications').then(({ data, error }) => {
        if (!cancelled && !error) setHasUnread(data === true);
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
