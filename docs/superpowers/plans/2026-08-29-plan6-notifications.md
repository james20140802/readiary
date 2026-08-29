# Plan ⑥ 인앱 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 친구 요청/수락·좋아요·댓글에서 인앱 알림을 생성하고, 소셜 페이지 알림 탭과 탭바 뱃지로 보여준다.

**Architecture:** `notifications` 테이블·RLS·타입은 Plan ①에서 이미 생성됨(클라이언트 INSERT 정책은 20260826 마이그레이션에서 의도적으로 제거, 주석에 "Plan ⑥에서 서버 측으로 구현" 명시). service role key가 env에 없으므로 INSERT는 **SECURITY DEFINER RPC 3종**으로만 연다: `notify_entry_event`(수신자를 entry 소유자로 함수가 직접 해석 — 위조 불가), `notify_friend_event`(friends 행 존재 검증), `retract_like_notification`(좋아요 취소 시 회수). 발생 지점은 기존 API 라우트 핸들러 4곳에 fire-and-forget으로 연결. UI는 SocialTab 3번째 탭 + Navbar 소셜 탭 unread dot.

**Tech Stack:** Next.js App Router, Supabase(RLS + SECURITY DEFINER RPC), vitest.

**Spec:** `docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md` §3.4, §8 (인앱 알림만. Web Push는 §11 순서상 마지막 — 이번 범위 제외)

## Global Constraints

- 색상은 반드시 CSS 변수 토큰(`bg-accent`, `text-ink-sub`, `text-ink-faint`, `bg-card`, `border-hairline`, `text-danger` 등)만. **`dark:` 프리픽스 금지** (토큰이 라이트/다크 자동 전환).
- 텍스트 토큰은 실존하는 것만: `text-quote`, `text-seal`, `text-body-sm`, `text-caption`. (`text-ink-muted`는 존재하지 않음 — `text-ink-sub`/`text-ink-faint`가 실존 토큰.)
- 아이콘은 lucide-react 단일. **신규 코드에 이모지 금지.**
- 검증 게이트: `npx tsc --noEmit` && `npx vitest run` && `npm run build`. **`npm run lint` 실행 금지**(Next 16에서 깨진 기존 이슈).
- **마이그레이션은 파일 작성만.** 원격 적용은 절대 금지(사용자 승인 후 컨트롤러가 처리).
- 프로덕션 Supabase에 로그인·계정 생성·데이터 삽입 금지.
- Supabase 클라이언트: 서버는 `createSupabaseServerClient()`(`lib/supabase/server.ts`), 브라우저는 `createSupabaseClient()`(`lib/supabase/client.ts`).
- 커밋: gitmoji + 한국어 제목.

## 참고 — 기존 구조 (조사 결과)

- `notifications` 테이블: `id, user_id(수신자), actor_id, type('friend_request'|'friend_accept'|'like'|'comment'), entry_id(null 허용), read_at, created_at`. RLS: select/update/delete own, `grant update (read_at) to authenticated`. INSERT 정책 없음(의도).
- entry 소유자: `entries.user_book_id → user_books.user_id`.
- 친구 요청: `app/api/friends/send/route.ts` — `userId`(요청자)→`friendId`(수신자), `friends` insert `{user_id, friend_id, status:'pending'}`.
- 수락: `app/api/friends/accept/route.ts` — `myId`(수락자), `friendId`(원 요청자). update `status='accepted'` where `user_id=friendId, friend_id=myId`.
- 좋아요: `app/api/likes/route.ts` — POST 토글(existingLike 있으면 delete/없으면 insert).
- 댓글: `app/api/comments/route.ts` — POST에서 `entryId`, `user.id`로 insert.
- 내 기록 상세 라우트: `/protected/entry/[entry_id]`.
- 소셜 페이지: `app/protected/social/page.tsx`(서버, 병렬 fetch) → `SocialTab`(클라이언트, `mainTab: 'feed'|'manage'`).
- 타입: `types/supabase.d.ts` 수동 관리(notifications Row/Insert/Update 이미 존재). RPC는 `Functions`에 수동 추가 필요.
- profiles 컬럼: `id, name, nickname, tag, bio, profile_image, created_at`.

---

### Task 1: 마이그레이션 SQL — 알림 RPC 3종 (파일 작성만)

**Files:**
- Create: `supabase/migrations/20260829000000_notification_rpcs.sql`
- Modify: `types/supabase.d.ts` (Functions 섹션에 RPC 시그니처 추가)

**Interfaces:**
- Produces: RPC `notify_entry_event(p_entry_id uuid, p_type text)`, `notify_friend_event(p_recipient uuid, p_type text)`, `retract_like_notification(p_entry_id uuid)` — Task 3이 `supabase.rpc(...)`로 호출.

- [ ] **Step 1: 마이그레이션 파일 작성** — 아래 SQL 전문 그대로:

```sql
-- Plan ⑥: 알림 INSERT 경로.
-- 20260826 마이그레이션에서 notifications_insert_as_actor 정책을 제거한 후속으로,
-- 검증을 내장한 SECURITY DEFINER RPC로만 알림을 생성한다.

-- 1) 기록 이벤트 알림(like/comment).
--    수신자는 함수가 entry 소유자로 직접 해석하므로 위조할 수 없다.
create or replace function public.notify_entry_event(
  p_entry_id uuid,
  p_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_recipient uuid;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if p_type not in ('like', 'comment') then
    raise exception 'invalid notification type: %', p_type;
  end if;

  select ub.user_id into v_recipient
  from entries e
  join user_books ub on ub.id = e.user_book_id
  where e.id = p_entry_id;

  -- 기록이 없거나 자기 기록이면 조용히 종료
  if v_recipient is null or v_recipient = v_actor then
    return;
  end if;

  -- 행위 사실 검증: 실제 좋아요/댓글 행이 있어야 알림을 만든다
  if p_type = 'like' and not exists (
    select 1 from likes where entry_id = p_entry_id and user_id = v_actor
  ) then
    return;
  end if;
  if p_type = 'comment' and not exists (
    select 1 from comments where entry_id = p_entry_id and user_id = v_actor
  ) then
    return;
  end if;

  -- 좋아요 토글 스팸 방지: 같은 행위자의 like 알림이 이미 있으면 스킵
  if p_type = 'like' and exists (
    select 1 from notifications
    where entry_id = p_entry_id and actor_id = v_actor and type = 'like'
  ) then
    return;
  end if;

  insert into notifications (user_id, actor_id, type, entry_id)
  values (v_recipient, v_actor, p_type, p_entry_id);
end;
$$;

-- 2) 좋아요 취소 시 해당 like 알림 회수
create or replace function public.retract_like_notification(
  p_entry_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from notifications
  where entry_id = p_entry_id
    and actor_id = auth.uid()
    and type = 'like';
end;
$$;

-- 3) 친구 이벤트 알림(friend_request/friend_accept).
--    friends 테이블의 실제 행 존재를 검증한다.
create or replace function public.notify_friend_event(
  p_recipient uuid,
  p_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if p_type not in ('friend_request', 'friend_accept') then
    raise exception 'invalid notification type: %', p_type;
  end if;
  if p_recipient = v_actor then
    return;
  end if;

  -- 행위 사실 검증
  if p_type = 'friend_request' and not exists (
    select 1 from friends
    where user_id = v_actor and friend_id = p_recipient and status = 'pending'
  ) then
    return;
  end if;
  if p_type = 'friend_accept' and not exists (
    select 1 from friends
    where user_id = p_recipient and friend_id = v_actor and status = 'accepted'
  ) then
    return;
  end if;

  -- 재요청 스팸 방지: 같은 조합의 안 읽은 알림이 있으면 스킵
  if exists (
    select 1 from notifications
    where user_id = p_recipient and actor_id = v_actor
      and type = p_type and read_at is null
  ) then
    return;
  end if;

  insert into notifications (user_id, actor_id, type)
  values (p_recipient, v_actor, p_type);
end;
$$;

revoke all on function public.notify_entry_event(uuid, text) from public;
revoke all on function public.retract_like_notification(uuid) from public;
revoke all on function public.notify_friend_event(uuid, text) from public;
grant execute on function public.notify_entry_event(uuid, text) to authenticated;
grant execute on function public.retract_like_notification(uuid) to authenticated;
grant execute on function public.notify_friend_event(uuid, text) to authenticated;
```

- [ ] **Step 2: `types/supabase.d.ts`의 `Functions` 섹션에 추가** (기존 Functions 정의 스타일에 맞춰; 이미 다른 함수 정의가 있으면 그 옆에):

```ts
notify_entry_event: {
  Args: { p_entry_id: string; p_type: string };
  Returns: undefined;
};
notify_friend_event: {
  Args: { p_recipient: string; p_type: string };
  Returns: undefined;
};
retract_like_notification: {
  Args: { p_entry_id: string };
  Returns: undefined;
};
```

- [ ] **Step 3: 게이트 실행** — `npx tsc --noEmit` && `npx vitest run` 통과 확인
- [ ] **Step 4: Commit** — `🗃️ feat(notifications): 알림 생성·회수 SECURITY DEFINER RPC 마이그레이션`

---

### Task 2: lib/notifications — 타입·포맷 유틸(+테스트)·서버 fetch

**Files:**
- Create: `lib/notifications/types.ts`
- Create: `lib/notifications/format.ts`
- Create: `lib/notifications/__tests__/format.test.ts`
- Create: `lib/notifications/fetchNotifications.ts`

**Interfaces:**
- Produces: `NotificationItem { id, type, createdAt, readAt, entryId, actorNickname, actorProfileImage }`, `buildNotificationMessage(type, nickname): string`, `formatRelativeTime(iso, now?): string`, `fetchNotifications(): Promise<NotificationItem[]>`, `fetchUnreadNotificationCount(): Promise<number>` — Task 4·5가 소비.

- [ ] **Step 1: `lib/notifications/types.ts`**

```ts
export type NotificationType = 'friend_request' | 'friend_accept' | 'like' | 'comment';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  entryId: string | null;
  actorNickname: string;
  actorProfileImage: string | null;
}
```

- [ ] **Step 2: 실패하는 테스트 작성** — `lib/notifications/__tests__/format.test.ts` (기존 테스트 스타일: describe/it 한국어):

```ts
import { describe, expect, it } from 'vitest';
import { buildNotificationMessage, formatRelativeTime } from '@/lib/notifications/format';

describe('buildNotificationMessage', () => {
  it('타입별 메시지를 만든다', () => {
    expect(buildNotificationMessage('friend_request', '상추')).toBe('상추님이 친구 신청을 보냈어요');
    expect(buildNotificationMessage('friend_accept', '상추')).toBe('상추님이 친구 신청을 수락했어요');
    expect(buildNotificationMessage('like', '상추')).toBe('상추님이 내 문장을 좋아해요');
    expect(buildNotificationMessage('comment', '상추')).toBe('상추님이 내 기록에 댓글을 남겼어요');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-29T12:00:00+09:00');

  it('1분 미만은 방금 전', () => {
    expect(formatRelativeTime('2026-08-29T11:59:30+09:00', now)).toBe('방금 전');
  });
  it('1시간 미만은 n분 전', () => {
    expect(formatRelativeTime('2026-08-29T11:15:00+09:00', now)).toBe('45분 전');
  });
  it('하루 미만은 n시간 전', () => {
    expect(formatRelativeTime('2026-08-29T05:00:00+09:00', now)).toBe('7시간 전');
  });
  it('7일 미만은 n일 전', () => {
    expect(formatRelativeTime('2026-08-27T12:00:00+09:00', now)).toBe('2일 전');
  });
  it('7일 이상은 절대 날짜', () => {
    expect(formatRelativeTime('2026-08-01T12:00:00+09:00', now)).toBe('2026년 8월 1일');
  });
  it('미래 타임스탬프(시계 오차)는 방금 전', () => {
    expect(formatRelativeTime('2026-08-29T12:00:30+09:00', now)).toBe('방금 전');
  });
});
```

- [ ] **Step 3: 실행해 실패 확인** — `npx vitest run lib/notifications`
- [ ] **Step 4: `lib/notifications/format.ts` 구현**

```ts
import type { NotificationType } from './types';

const MESSAGES: Record<NotificationType, (nickname: string) => string> = {
  friend_request: (n) => `${n}님이 친구 신청을 보냈어요`,
  friend_accept: (n) => `${n}님이 친구 신청을 수락했어요`,
  like: (n) => `${n}님이 내 문장을 좋아해요`,
  comment: (n) => `${n}님이 내 기록에 댓글을 남겼어요`,
};

export function buildNotificationMessage(type: NotificationType, nickname: string): string {
  return MESSAGES[type](nickname);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < MINUTE) return '방금 전';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
```

- [ ] **Step 5: 테스트 통과 확인** — `npx vitest run lib/notifications`
- [ ] **Step 6: `lib/notifications/fetchNotifications.ts`** — 서버 전용. actor 조인의 FK 힌트 이름은 `types/supabase.d.ts`의 notifications `Relationships`에서 실제 `foreignKeyName`을 확인해 사용할 것(기본 명명은 `notifications_actor_id_fkey`).

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { NotificationItem, NotificationType } from './types';

const NOTIFICATIONS_LIMIT = 50;

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, type, created_at, read_at, entry_id, actor:profiles!notifications_actor_id_fkey(nickname, profile_image)'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    type: row.type as NotificationType,
    createdAt: row.created_at,
    readAt: row.read_at,
    entryId: row.entry_id,
    actorNickname: row.actor?.nickname ?? '알 수 없음',
    actorProfileImage: row.actor?.profile_image ?? null,
  }));
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) return 0;
  return count ?? 0;
}
```

(조인 결과 타입이 배열로 추론되면 `.single()` 관례 대신 기존 코드—`app/api/comments/route.ts`의 profile 조인—가 어떻게 다루는지 보고 맞출 것.)

- [ ] **Step 7: 게이트** — `npx tsc --noEmit` && `npx vitest run`
- [ ] **Step 8: Commit** — `✨ feat(notifications): 알림 타입·메시지/시간 포맷·서버 조회 유틸`

---

### Task 3: 발생 지점 연결 + 읽음 처리 API

**Files:**
- Create: `lib/notifications/notify.ts`
- Create: `app/api/notifications/read/route.ts`
- Modify: `app/api/friends/send/route.ts`
- Modify: `app/api/friends/accept/route.ts`
- Modify: `app/api/likes/route.ts`
- Modify: `app/api/comments/route.ts` (POST만)

**Interfaces:**
- Consumes: Task 1의 RPC 3종(타입은 `types/supabase.d.ts` Functions에 이미 추가됨).
- Produces: `POST /api/notifications/read` (본인 알림 전체 읽음 처리) — Task 4가 호출.

- [ ] **Step 1: `lib/notifications/notify.ts`** — fire-and-forget 헬퍼. 알림 실패가 본 동작(좋아요/댓글/친구)을 절대 막지 않는다:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Supabase = SupabaseClient<Database>;

export async function notifyEntryEvent(
  supabase: Supabase,
  entryId: string,
  type: 'like' | 'comment'
): Promise<void> {
  const { error } = await supabase.rpc('notify_entry_event', {
    p_entry_id: entryId,
    p_type: type,
  });
  if (error) console.error('notify_entry_event 실패:', error.message);
}

export async function retractLikeNotification(supabase: Supabase, entryId: string): Promise<void> {
  const { error } = await supabase.rpc('retract_like_notification', { p_entry_id: entryId });
  if (error) console.error('retract_like_notification 실패:', error.message);
}

export async function notifyFriendEvent(
  supabase: Supabase,
  recipientId: string,
  type: 'friend_request' | 'friend_accept'
): Promise<void> {
  const { error } = await supabase.rpc('notify_friend_event', {
    p_recipient: recipientId,
    p_type: type,
  });
  if (error) console.error('notify_friend_event 실패:', error.message);
}
```

(`createSupabaseServerClient()`가 반환하는 클라이언트 타입과 어긋나면 — 예: cookies 옵션 제네릭 — `Supabase` 타입을 그 반환 타입 `Awaited<ReturnType<typeof createSupabaseServerClient>>`로 정의해도 된다.)

- [ ] **Step 2: 발생 지점 4곳 연결** — 각 라우트에서 본 동작 성공 직후, 성공 응답을 반환하기 전에 `await`로 호출(fire-and-forget은 "실패해도 본 응답에 영향 없음"의 뜻 — 헬퍼가 오류를 삼키므로 await해도 안전):
  - `app/api/friends/send/route.ts`: friends insert 성공 후 `await notifyFriendEvent(supabase, friendId, 'friend_request');`
  - `app/api/friends/accept/route.ts`: update 성공 후 `await notifyFriendEvent(supabase, friendId, 'friend_accept');` (friendId = 원 요청자 = 수신자)
  - `app/api/likes/route.ts`: liked 분기(insert 성공 후) `await notifyEntryEvent(supabase, entryId, 'like');` / unliked 분기(delete 성공 후) `await retractLikeNotification(supabase, entryId);`
  - `app/api/comments/route.ts`: POST insert 성공 후 `await notifyEntryEvent(supabase, entryId, 'comment');`

- [ ] **Step 3: `app/api/notifications/read/route.ts`**

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: 게이트** — `npx tsc --noEmit` && `npx vitest run` && `npm run build`
- [ ] **Step 5: Commit** — `✨ feat(notifications): 친구·좋아요·댓글 핸들러에 알림 생성 연결 + 읽음 API`

---

### Task 4: 소셜 페이지 알림 탭 UI

**Files:**
- Create: `app/protected/social/_components/NotificationList.tsx`
- Modify: `app/protected/social/_components/SocialTab.tsx`
- Modify: `app/protected/social/page.tsx`

**Interfaces:**
- Consumes: `NotificationItem`, `buildNotificationMessage`, `formatRelativeTime`(Task 2), `POST /api/notifications/read`(Task 3).

- [ ] **Step 1: `NotificationList.tsx`** — 클라이언트 컴포넌트:

```tsx
'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { buildNotificationMessage, formatRelativeTime } from '@/lib/notifications/format';
import type { NotificationItem } from '@/lib/notifications/types';

interface Props {
  notifications: NotificationItem[];
  onGoToFriends: () => void;
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
            <Avatar src={n.actorProfileImage} alt={n.actorNickname} fallbackText={n.actorNickname} size="sm" />
            <div className="min-w-0 flex-1">
              <p className={`text-body-sm ${isUnread ? 'text-ink font-medium' : 'text-ink-sub'}`}>
                {buildNotificationMessage(n.type, n.actorNickname)}
              </p>
              <p className="text-caption text-ink-faint mt-0.5">{formatRelativeTime(n.createdAt)}</p>
            </div>
            {isUnread && (
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent" aria-label="읽지 않음" />
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
            <button type="button" onClick={onGoToFriends} className="block w-full text-left">
              {body}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

(Avatar props 시그니처는 `components/ui/Avatar.tsx`를 열어 실제와 맞출 것.)

- [ ] **Step 2: `SocialTab.tsx` 수정**
  - `mainTab` 타입을 `'feed' | 'manage' | 'notifications'`로 확장, props에 `notifications: NotificationItem[]` 추가.
  - `mainTabs`에 `{ label: '알림', value: 'notifications' }` 추가. **이 참에 기존 탭 라벨의 이모지 제거**: `'✨ 피드'→'피드'`, `'👥 친구 관리'→'친구 관리'`, friendTabs `'📋 목록'→'목록'`, `'⏳ 받은 요청'→'받은 요청'`, `'📤 보낸 요청'→'보낸 요청'` (Global Constraints의 이모지 금지 정합).
  - 알림 탭 최초 오픈 시 1회만 읽음 처리(ref 가드 — `FriendRequestForm`의 initialQuery 1회 가드와 같은 패턴):

```tsx
const hasMarkedRead = useRef(false);

useEffect(() => {
  if (mainTab !== 'notifications' || hasMarkedRead.current) return;
  hasMarkedRead.current = true;
  fetch('/api/notifications/read', { method: 'POST' }).catch(() => {});
}, [mainTab]);
```

  (표시용 `readAt`은 서버에서 받은 초기값 그대로 유지 — 이번 방문에 새로 온 알림이 어떤 것인지 계속 보이도록. 다음 방문부터 읽음으로 표시됨.)
  - 알림 탭 렌더:

```tsx
{mainTab === 'notifications' && (
  <div className="animate-in fade-in duration-300">
    <NotificationList
      notifications={notifications}
      onGoToFriends={() => {
        setMainTab('manage');
        setFriendTab('pending');
      }}
    />
  </div>
)}
```

- [ ] **Step 3: `app/protected/social/page.tsx` 수정** — 기존 병렬 fetch에 `fetchNotifications()` 추가하고 `SocialTab`에 `notifications` prop 전달.
- [ ] **Step 4: 게이트** — `npx tsc --noEmit` && `npx vitest run` && `npm run build`
- [ ] **Step 5: Commit** — `✨ feat(notifications): 소셜 페이지 알림 탭 + 읽음 처리`

---

### Task 5: Navbar 소셜 탭 unread 뱃지

**Files:**
- Modify: `components/Navbar.tsx`

**Interfaces:**
- Consumes: notifications RLS select_own(브라우저 클라이언트로 본인 미읽음 count 직접 조회 가능).

- [ ] **Step 1: Navbar에 미읽음 수 조회 추가** — 기존에 user를 가져오는 클라이언트 패턴에 맞춰:

```tsx
const [hasUnread, setHasUnread] = useState(false);
const pathname = usePathname(); // 이미 있으면 재사용

useEffect(() => {
  let cancelled = false;
  const supabase = createSupabaseClient();
  supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .then(({ count, error }) => {
      if (!cancelled && !error) setHasUnread((count ?? 0) > 0);
    });
  return () => {
    cancelled = true;
  };
}, [pathname]);
```

  (RLS가 본인 것만 반환. 비로그인 상태면 count 0. `pathname` 의존성으로 페이지 이동 때마다 갱신 — 알림 탭에서 읽고 다른 페이지로 가면 dot이 사라진다. 폴링·실시간은 도입하지 않는다.)

- [ ] **Step 2: 소셜 탭 아이콘에 dot** — `navItems`를 map하는 모바일 하단 탭바와 데스크톱 네브 **양쪽**에서, `href === '/protected/social'` 항목의 아이콘을 relative wrapper로 감싸고:

```tsx
<span className="relative">
  <item.icon size={...기존값} />
  {hasUnread && item.href === '/protected/social' && (
    <span className="absolute -top-0.5 -right-1 h-[7px] w-[7px] rounded-full bg-accent">
      <span className="sr-only">읽지 않은 알림 있음</span>
    </span>
  )}
</span>
```

  (기존 아이콘 렌더 방식·크기·클래스는 Navbar 실제 코드에 맞출 것. 색은 `bg-accent` — `Chip`의 dot과 같은 7px 패턴.)

- [ ] **Step 3: 게이트** — `npx tsc --noEmit` && `npx vitest run` && `npm run build`
- [ ] **Step 4: Commit** — `✨ feat(notifications): 탭바 소셜 탭에 미읽음 알림 뱃지`

---

## 검증 시나리오 (최종 리뷰 참고)

- RPC는 파일로만 존재(원격 미적용) → 로컬에서 알림 생성 동작은 검증 불가. tsc/vitest/build 게이트 + 코드 리뷰로 검증하고, 적용은 머지 시 사용자 승인 후.
- 알림 실패가 좋아요/댓글/친구 API의 성공 응답을 막지 않는지(헬퍼가 오류 삼킴).
- 자기 기록에 좋아요/댓글 → 알림 없음(RPC가 recipient=actor면 no-op).
- 좋아요 토글 반복 → 알림 1개 유지(생성 dedup + 취소 시 회수).
