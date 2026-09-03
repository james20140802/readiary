'use client';

import { useEffect, useRef } from 'react';
import NotificationList from './NotificationList';
import { NOTIFICATIONS_LIMIT, type NotificationItem } from '@/lib/notifications/types';
import { NOTIFICATIONS_READ_EVENT } from '@/hooks/useUnreadNotifications';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

interface Props {
  notifications: NotificationItem[];
  /** 서버 조회 자체가 실패했는지 — true면 "알림 없음" 대신 에러 문구를 보여준다 */
  error?: boolean;
}

export default function NotificationsView({ notifications, error = false }: Props) {
  // 열어 둔 채 써도 새 알림이 새로고침 없이 도착하도록
  useLiveRefresh();

  const hasMarkedRead = useRef(false);
  useEffect(() => {
    if (hasMarkedRead.current) return;
    hasMarkedRead.current = true;
    const unreadIds = notifications.filter((n) => n.readAt === null).map((n) => n.id);
    // 목록은 최신 NOTIFICATIONS_LIMIT건만 렌더되므로, 상한에 걸친 경우 화면에
    // 나오지 못하는 더 오래된 미읽음 알림이 남아 뱃지가 영구 점등될 수 있다.
    // 이 경우 마지막(가장 오래된) 항목의 시각 이전을 함께 읽음 처리한다.
    const atLimit = notifications.length >= NOTIFICATIONS_LIMIT;
    if (unreadIds.length === 0 && !atLimit) return;

    const body: { ids?: string[]; clearOlderThan?: string } = {};
    if (unreadIds.length > 0) body.ids = unreadIds;
    if (atLimit) body.clearOlderThan = notifications[notifications.length - 1].createdAt;

    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => {
        // 헤더·내브바의 뱃지는 이 페이지 진입과 동시에 세어져 읽음 처리 전
        // 값을 물고 있을 수 있다 — 성공하면 즉시 다시 세라고 신호를 보낸다
        if (res.ok) window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
      })
      .catch(() => {});
  }, [notifications]);

  return <NotificationList notifications={notifications} error={error} />;
}
