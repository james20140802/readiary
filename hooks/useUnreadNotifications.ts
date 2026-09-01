'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

/**
 * 안 읽은 알림 존재 여부(뱃지) — 경로 이동뿐 아니라 탭 복귀·창 포커스,
 * 그리고 보이는 동안 60초 주기로 다시 세어, 열어 둔 채 쓰는 웹앱에서도
 * 뱃지가 스스로 켜지고 꺼진다.
 */
export function useUnreadNotifications(enabled: boolean) {
  const [hasUnread, setHasUnread] = useState(false);
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
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [pathname, enabled]);

  return hasUnread;
}
