'use client';

import Link from 'next/link';
import { Bell, BookOpen } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { buildNotificationMessage, formatRelativeTime } from '@/lib/notifications/format';
import PushSeen from '@/components/PushSeen';
import type { Delivery, PushItem } from '@/lib/push/types';
import type { NotificationItem } from '@/lib/notifications/types';

interface Props {
  notifications: NotificationItem[];
  deliveries?: Delivery[];
  deliveriesError?: boolean;
  /** SSR과 hydration이 같은 시각을 사용하고, 라이브 갱신마다 서버에서 새로 전달한다. */
  referenceTime: string;
  /** 서버 조회 자체가 실패했는지 — true면 빈 상태 대신 에러 문구를 보여준다 */
  error?: boolean;
}

export default function NotificationList({
  notifications,
  referenceTime,
  error = false,
  deliveries = [],
  deliveriesError = false,
}: Props) {
  const now = new Date(referenceTime);
  if (!notifications.length && !deliveries.length && !error && !deliveriesError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Bell size={28} className="text-ink-faint" />
        <p className="text-body-sm text-ink-faint">아직 알림이 없어요</p>
        <p className="text-caption text-ink-faint">친구들의 반응과 독서 알림이 여기에 모여요</p>
      </div>
    );
  }

  const rows = [
    ...notifications.map((n) => ({ source: 'social' as const, createdAt: n.createdAt, item: n })),
    ...deliveries.map((d) => ({ source: 'push' as const, createdAt: d.created_at, item: d })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <div>
      {(error || deliveriesError) && (
        <p role="status" className="py-4 text-body-sm text-ink-sub">
          {error && deliveriesError
            ? '알림을 불러오지 못했습니다.'
            : '일부 알림을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.'}
        </p>
      )}
      <ul className="divide-y divide-hairline">
        {rows.map((row) => {
          if (row.source === 'push') {
            const d = row.item;
            const unread = !d.opened_at;
            return (
              <li key={`push-${d.id}`} className="py-3.5">
                <PushSeen kind="inbox" id={d.id} />
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-card-raised text-ink-sub">
                    <BookOpen size={16} strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <ul className="space-y-2">
                      {(d.items as unknown as PushItem[]).map((item, i) => (
                        <li key={i}>
                          <Link
                            href={item.href}
                            className={`block text-button-sm hover:underline focus-visible:outline-accent ${unread ? 'font-medium text-ink' : 'text-ink-sub'}`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <time
                      dateTime={d.created_at}
                      className="mt-0.5 block text-caption text-ink-faint"
                    >
                      {formatRelativeTime(d.created_at, now)}
                    </time>
                  </div>
                  {unread && (
                    <>
                      <span
                        className="mt-3 h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
                        aria-hidden
                      />
                      <span className="sr-only">읽지 않음</span>
                    </>
                  )}
                </div>
              </li>
            );
          }
          const n = row.item;
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
                <time dateTime={n.createdAt} className="block text-caption text-ink-faint mt-0.5">
                  {formatRelativeTime(n.createdAt, now)}
                </time>
              </div>
              {isUnread && (
                <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
              )}
              {isUnread && <span className="sr-only">읽지 않음</span>}
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
                // 이동할 곳이 없어도(예: 지워진 기록) 키보드로 목록을 훑을 때 다른 항목과
                // 동일하게 탭 정지점이 되도록 버튼으로 감싼다 — 동작은 없다
                <button type="button" className="block w-full text-left">
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
