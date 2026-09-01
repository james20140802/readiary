'use client';

import { useEffect, useRef } from 'react';
import NotificationList from './NotificationList';
import { NOTIFICATIONS_LIMIT, type NotificationItem } from '@/lib/notifications/types';

interface Props {
  notifications: NotificationItem[];
}

export default function NotificationsView({ notifications }: Props) {
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
    }).catch(() => {});
  }, [notifications]);

  return <NotificationList notifications={notifications} />;
}
