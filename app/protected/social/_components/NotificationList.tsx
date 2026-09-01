'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { buildNotificationMessage, formatRelativeTime } from '@/lib/notifications/format';
import type { NotificationItem } from '@/lib/notifications/types';

interface Props {
  notifications: NotificationItem[];
}

export default function NotificationList({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Bell size={28} className="text-ink-faint" />
        <p className="text-body-sm text-ink-faint">아직 알림이 없어요</p>
        <p className="text-caption text-ink-faint">친구들의 반응이 여기에 모여요</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-hairline">
      {notifications.map((n) => {
        const isUnread = n.readAt === null;
        const body = (
          <div className="flex items-center gap-3 py-3.5">
            <Avatar
              src={n.actorProfileImage}
              alt={n.actorNickname}
              fallbackText={n.actorNickname.charAt(0).toUpperCase()}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className={`text-body-sm ${isUnread ? 'text-ink font-medium' : 'text-ink-sub'}`}>
                {buildNotificationMessage(n.type, n.actorNickname)}
              </p>
              <p className="text-caption text-ink-faint mt-0.5">
                {formatRelativeTime(n.createdAt)}
              </p>
            </div>
            {isUnread && (
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
                aria-label="읽지 않음"
              />
            )}
          </div>
        );

        // 좋아요·댓글은 해당 기록으로(기록이 지워졌으면 링크 없음), 친구 알림은
        // 친구 페이지로 (수락됨 → 친구 목록, 새 요청 → 받은 요청 탭)
        const href =
          n.type === 'like' || n.type === 'comment'
            ? n.entryId
              ? `/protected/entry/${n.entryId}`
              : null
            : n.type === 'friend_accept'
              ? '/protected/social/friends'
              : '/protected/social/friends?tab=pending';

        return (
          <li key={n.id}>
            {href ? (
              <Link href={href} className="block">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
