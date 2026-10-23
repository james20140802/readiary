'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { buildNotificationMessage, formatRelativeTime } from '@/lib/notifications/format';
import PushSeen from '@/components/PushSeen';
import { Avatar } from '@/components/ui/Avatar';
import { groupByDay } from '@/components/social/feedFormat';
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

type Row =
  | { source: 'social'; createdAt: string; item: NotificationItem }
  | { source: 'push'; createdAt: string; item: Delivery };

/** 시안 notifications.html .nt — 40px 얼굴·표시, 16px 문장, 13px 시각. 안 읽은 줄은 왼쪽 여백에 파란 점 */
const ROW = 'relative grid grid-cols-[40px_1fr] gap-3.5 border-t border-hairline py-4';

function UnreadDot() {
  return (
    <>
      <span
        aria-hidden
        className="absolute -left-3.5 top-8 h-[7px] w-[7px] rounded-full bg-accent"
      />
      <span className="sr-only">읽지 않음</span>
    </>
  );
}

function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgb(127_127_127/.12)] text-ink-sub">
      {children}
    </span>
  );
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
      <div className="mt-8 border-t border-hairline pt-8">
        <p className="font-serif text-[22px] font-semibold leading-[1.5] text-ink">
          아직 알림이 없어요.
        </p>
        <p className="mt-2 font-sans text-body-sm text-ink-sub">
          친구가 내 문장에 남긴 반응과 독서 알림이 여기에 모여요.
        </p>
      </div>
    );
  }

  const rows: Row[] = [
    ...notifications.map((n) => ({ source: 'social' as const, createdAt: n.createdAt, item: n })),
    ...deliveries.map((d) => ({ source: 'push' as const, createdAt: d.created_at, item: d })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const groups = groupByDay(rows, now);

  return (
    <div>
      {(error || deliveriesError) && (
        <p role="status" className="mt-5 font-sans text-body-sm text-ink-sub">
          {error && deliveriesError
            ? '알림을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.'
            : '일부 알림을 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.'}
        </p>
      )}
      {groups.map((group, gi) => (
        <section
          key={group.label}
          aria-labelledby={`notifications-${gi}`}
          className={gi === 0 ? 'mt-[22px]' : 'mt-[34px]'}
        >
          <h2 id={`notifications-${gi}`} className="mb-1.5 font-sans text-overline text-ink-sub">
            {group.label}
          </h2>
          <ul>
            {group.rows.map((row) =>
              row.source === 'push' ? (
                <PushRow key={`push-${row.item.id}`} d={row.item} now={now} />
              ) : (
                <SocialRow key={row.item.id} n={row.item} now={now} />
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PushRow({ d, now }: { d: Delivery; now: Date }) {
  const unread = !d.opened_at;
  return (
    <li className={ROW}>
      {unread && <UnreadDot />}
      <IconCircle>
        <BookOpen size={19} strokeWidth={1.75} aria-hidden />
      </IconCircle>
      <div className="min-w-0">
        <PushSeen kind="inbox" id={d.id} />
        <ul className="space-y-1">
          {(d.items as unknown as PushItem[]).map((item, i) => (
            <li key={i}>
              <Link
                href={item.href}
                className="font-sans text-[16px] font-medium leading-[1.5] text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <time
          dateTime={d.created_at}
          className="mt-1.5 block font-sans text-[13px] font-medium text-ink-faint"
        >
          {formatRelativeTime(d.created_at, now)}
        </time>
      </div>
    </li>
  );
}

function SocialRow({ n, now }: { n: NotificationItem; now: Date }) {
  const isUnread = n.readAt === null;
  const hasMissingEntry = (n.type === 'like' || n.type === 'comment') && !n.entryId;
  const message = buildNotificationMessage(n.type, n.actorNickname);
  const name = message.startsWith(n.actorNickname) ? n.actorNickname : '';

  const body = (
    <>
      <Avatar
        src={n.actorProfileImage}
        alt=""
        fallbackText={n.actorNickname.charAt(0).toUpperCase()}
        className="!border-0 !bg-hairline"
      />
      <div className="min-w-0">
        <p className="font-sans text-[16px] font-medium leading-[1.5] text-ink">
          {name && <b className="font-bold">{name}</b>}
          {message.slice(name.length)}
        </p>
        {hasMissingEntry && (
          <p className="mt-0.5 font-sans text-[14px] text-ink-sub">연결된 기록을 열 수 없어요</p>
        )}
        <time
          dateTime={n.createdAt}
          className="mt-1.5 block font-sans text-[13px] font-medium text-ink-faint"
        >
          {formatRelativeTime(n.createdAt, now)}
        </time>
      </div>
    </>
  );

  // 좋아요·댓글은 해당 기록으로(연결 정보가 없으면 링크 없음), 친구 알림은
  // 친구 페이지로 (수락됨 → 친구 목록, 새 요청 → 받은 요청 탭)
  const href =
    n.type === 'like' || n.type === 'comment'
      ? n.entryId
        ? `/entry/${n.entryId}`
        : null
      : n.type === 'friend_accept'
        ? '/social/friends'
        : '/social/friends?tab=pending';

  return (
    <li className="relative">
      {isUnread && <UnreadDot />}
      {href ? (
        <Link
          href={href}
          className={`${ROW} hover:[&_p:first-child]:underline focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent`}
        >
          {body}
        </Link>
      ) : (
        <div className={ROW}>{body}</div>
      )}
    </li>
  );
}
