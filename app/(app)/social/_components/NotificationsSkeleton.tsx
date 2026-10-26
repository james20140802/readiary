'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { NotificationItem } from '@/lib/notifications/types';
import NotificationsHeader from '@/components/social/NotificationsHeader';
import NotificationList from './NotificationList';

// 2026-10-23 10:00 KST 비슷한 고정 기준 시각
const REFERENCE_TIME = '2026-10-23T01:00:00.000Z';
const hoursAgo = (h: number) => new Date(Date.parse(REFERENCE_TIME) - h * 3_600_000).toISOString();

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'skeleton-n0',
    type: 'friend_request',
    createdAt: hoursAgo(0.2),
    readAt: hoursAgo(1),
    entryId: null,
    actorNickname: filler(2),
    actorProfileImage: null,
  },
  {
    id: 'skeleton-n1',
    type: 'comment',
    createdAt: hoursAgo(1),
    readAt: hoursAgo(1),
    entryId: 'skeleton-e9',
    actorNickname: filler(2),
    actorProfileImage: null,
  },
  {
    id: 'skeleton-n2',
    type: 'like',
    createdAt: hoursAgo(3),
    readAt: hoursAgo(1),
    entryId: 'skeleton-e9',
    actorNickname: filler(2),
    actorProfileImage: null,
  },
  {
    id: 'skeleton-n3',
    type: 'friend_accept',
    createdAt: hoursAgo(60),
    readAt: hoursAgo(1),
    entryId: null,
    actorNickname: filler(2),
    actorProfileImage: null,
  },
];

/**
 * 알림을 불러오는 동안 — 실제 NotificationsHeader·NotificationList를 자리용 데이터로 그린다.
 * 읽음 처리·실시간 갱신(NotificationsView)은 실제로 불러온 데이터가 아니므로 쓰지 않는다.
 * 기기 알림(deliveries)의 PushRow는 보이자마자 '읽음' API를 실제로 호출하므로
 * 자리용 글로는 켜지 않는다 — 소셜 알림만 자리를 보여준다.
 */
export default function NotificationsSkeleton() {
  return (
    <>
      <NotificationsHeader />
      <SkeletonScope label="알림을 펼치는 중">
        <NotificationList notifications={NOTIFICATIONS} referenceTime={REFERENCE_TIME} />
      </SkeletonScope>
    </>
  );
}
