'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { buildNotificationMessage, formatRelativeTime } from '@/lib/notifications/format';
import type { NotificationItem, NotificationType } from '@/lib/notifications/types';

interface Props {
  notifications: NotificationItem[];
  onGoToFriends: (type: NotificationType) => void;
}

export default function NotificationList({ notifications, onGoToFriends }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-hairline rounded-2xl">
        <Bell size={32} className="text-ink-faint" />
        <p className="text-body-sm font-medium text-ink">아직 알림이 없어요</p>
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

        if ((n.type === 'like' || n.type === 'comment') && n.entryId) {
          return (
            <li key={n.id}>
              <Link href={`/protected/entry/${n.entryId}`} className="block">
                {body}
              </Link>
            </li>
          );
        }
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onGoToFriends(n.type)}
              className="block w-full text-left"
            >
              {body}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
