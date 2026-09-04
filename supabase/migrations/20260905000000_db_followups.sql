-- DB 후속 묶음(2026-09-05): 알림 자동 회수 · finished_at 백필 · badges 테이블 삭제.
--
-- 1) 알림 자동 회수 — notifications에 comment_id(comments)·friendship_id(friends)를 두고 둘 다 on delete cascade.
--    댓글을 지우거나 friends 행이 사라지면(요청 취소·거절·친구 끊기) 상대 알림이 DB에서 함께 사라진다.
--    앱 코드가 회수를 잊을 길이 없고, 수신자 소유 행을 대신 지우는 SECURITY DEFINER 삭제 함수도 필요 없다.
--    부수 효과: 친구를 끊으면 옛 friend_request·friend_accept 알림도 지워져 다시 요청하면 알림이 다시 간다
--    (그동안은 (user_id, actor_id, type) 유니크 인덱스 때문에 재알림이 없었다).
--    기존 알림: 친구 알림은 friends 행과 대조해 연결하고, 대조되는 행이 없는 잔존 알림은 지운다.
--    댓글 알림은 (entry, actor)별 생성 순서로 댓글과 짝지어 연결하고, 짝이 없는(댓글이 이미 지워진) 알림은 지운다.
-- 2) user_books.finished_at 백필 — 완독인데 값이 빈 행은 마지막 기록 시각, 기록이 없으면 등록 시각으로.
--    발췌집 정렬이 등록 시각 대체값 대신 실제에 가까운 완독 시각을 쓰게 된다.
-- 3) badges·user_badges 삭제 — 앱 코드 참조는 PR #63에서 사라졌고 테이블·정책만 남아 있었다.
--
-- 배포 순서: 이 마이그레이션을 먼저 적용해도 옛 코드가 그대로 동작한다(p_comment_id는 선택 인자).
--   새 코드가 옛 DB를 만나면 댓글 알림 생성만 조용히 실패하므로 마이그레이션 → 코드 순으로 배포한다.

-- 1) 알림 연결 컬럼 ---------------------------------------------------------------

alter table public.notifications
  add column if not exists comment_id uuid references public.comments (id) on delete cascade,
  add column if not exists friendship_id uuid references public.friends (id) on delete cascade;

-- cascade 삭제가 원본 행 id로 알림을 찾을 때 쓰는 인덱스. 댓글 알림은 댓글당 하나뿐이라 유니크로 둔다.
create unique index if not exists notifications_comment_id_unique
  on public.notifications (comment_id)
  where comment_id is not null;
create index if not exists notifications_friendship_id_idx
  on public.notifications (friendship_id)
  where friendship_id is not null;

-- 기존 친구 알림을 friends 행과 연결한다. 요청 알림은 "행위자 → 수신자" 행, 수락 알림은 "수신자 → 행위자" 행.
update public.notifications n
set friendship_id = (
  select f.id from public.friends f
  where f.user_id = n.actor_id and f.friend_id = n.user_id
  order by f.requested_at nulls last, f.id
  limit 1
)
where n.type = 'friend_request' and n.friendship_id is null;

update public.notifications n
set friendship_id = (
  select f.id from public.friends f
  where f.user_id = n.user_id and f.friend_id = n.actor_id
  order by f.accepted_at nulls last, f.id
  limit 1
)
where n.type = 'friend_accept' and n.friendship_id is null;

-- 연결할 friends 행이 없는 친구 알림은 이미 취소·거절·끊긴 요청의 잔존물이다.
delete from public.notifications
where type in ('friend_request', 'friend_accept') and friendship_id is null;

-- 기존 댓글 알림은 같은 (entry, actor)의 댓글과 생성 순서대로 짝짓는다.
with n as (
  select id, entry_id, actor_id,
         row_number() over (partition by entry_id, actor_id order by created_at, id) as rn
  from public.notifications
  where type = 'comment' and comment_id is null
), c as (
  select id, entry_id, user_id,
         row_number() over (partition by entry_id, user_id order by created_at, id) as rn
  from public.comments
)
update public.notifications x
set comment_id = c.id
from n
join c on c.entry_id = n.entry_id and c.user_id = n.actor_id and c.rn = n.rn
where x.id = n.id;

-- 짝지을 댓글이 없는 댓글 알림은 댓글이 이미 지워진 잔존물이다.
delete from public.notifications
where type = 'comment' and comment_id is null;

-- 2) 알림 생성 RPC 갱신 ------------------------------------------------------------

-- 기록 이벤트 알림(like/comment). p_comment_id가 오면 그 댓글 행에 알림을 매단다.
-- 시그니처가 바뀌므로(선택 인자 추가) 옛 함수를 지우고 다시 만든다. PostgREST는 이름 인자 호출이라
-- p_comment_id를 생략한 옛 호출도 default로 흡수된다.
drop function if exists public.notify_entry_event(uuid, text);

create or replace function public.notify_entry_event(
  p_entry_id uuid,
  p_type text,
  p_comment_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
  if p_comment_id is not null and p_type <> 'comment' then
    raise exception 'p_comment_id is only valid for comment notifications';
  end if;

  -- 수신자는 entry 소유자로 직접 해석하므로 위조할 수 없다
  select ub.user_id into v_recipient
  from entries e
  join user_books ub on ub.id = e.user_book_id
  where e.id = p_entry_id;

  -- 기록이 없거나 자기 기록이면 조용히 종료
  if v_recipient is null or v_recipient = v_actor then
    return;
  end if;

  if p_type = 'like' then
    -- 행위 사실 검증: 실제 좋아요 행이 있어야 알림을 만든다
    if not exists (
      select 1 from likes where entry_id = p_entry_id and user_id = v_actor
    ) then
      return;
    end if;
    -- 토글 스팸·동시 호출 레이스는 부분 유니크 인덱스로 막는다
    insert into notifications (user_id, actor_id, type, entry_id)
    values (v_recipient, v_actor, 'like', p_entry_id)
    on conflict (entry_id, actor_id) where type = 'like' do nothing;
    return;
  end if;

  -- comment, 댓글 id가 있는 새 경로: 댓글 행이 실제로 있고 호출자의 것이어야 한다.
  -- 알림은 댓글 행에 매달려 댓글이 지워지면 cascade로 함께 사라진다.
  if p_comment_id is not null then
    if not exists (
      select 1 from comments
      where id = p_comment_id and entry_id = p_entry_id and user_id = v_actor
    ) then
      return;
    end if;
    insert into notifications (user_id, actor_id, type, entry_id, comment_id)
    values (v_recipient, v_actor, 'comment', p_entry_id, p_comment_id)
    on conflict (comment_id) where comment_id is not null do nothing;
    return;
  end if;

  -- comment, 댓글 id가 없는 구형 경로: 실제 댓글 수를 넘지 않게 상한을 두고
  -- (entry, actor) 어드바이저리 락으로 동시 호출을 직렬화한다.
  if not exists (
    select 1 from comments where entry_id = p_entry_id and user_id = v_actor
  ) then
    return;
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended('notify_comment:' || p_entry_id::text || ':' || v_actor::text, 0)
  );
  if (
    select count(*) from notifications
    where entry_id = p_entry_id and actor_id = v_actor and type = 'comment'
  ) >= (
    select count(*) from comments where entry_id = p_entry_id and user_id = v_actor
  ) then
    return;
  end if;
  insert into notifications (user_id, actor_id, type, entry_id)
  values (v_recipient, v_actor, 'comment', p_entry_id);
end;
$$;

-- 친구 이벤트 알림(friend_request/friend_accept). 검증에 쓰던 friends 행의 id를 알림에 저장한다.
create or replace function public.notify_friend_event(
  p_recipient uuid,
  p_type text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_friendship uuid;
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

  -- 행위 사실 검증: 실제 friends 행이 있어야 하고, 그 행에 알림을 매단다
  if p_type = 'friend_request' then
    select id into v_friendship from friends
    where user_id = v_actor and friend_id = p_recipient and status = 'pending'
    order by requested_at nulls last, id
    limit 1;
  else
    select id into v_friendship from friends
    where user_id = p_recipient and friend_id = v_actor and status = 'accepted'
    order by accepted_at nulls last, id
    limit 1;
  end if;
  if v_friendship is null then
    return;
  end if;

  -- 재요청 스팸 방지: 같은 조합의 알림이 이미 있으면 스킵(읽음 여부 무관).
  -- 친구를 끊으면 friends 행과 함께 옛 알림도 사라지므로 새 요청은 다시 알림이 간다.
  if exists (
    select 1 from notifications
    where user_id = p_recipient and actor_id = v_actor and type = p_type
  ) then
    return;
  end if;

  insert into notifications (user_id, actor_id, type, friendship_id)
  values (p_recipient, v_actor, p_type, v_friendship)
  on conflict (user_id, actor_id, type)
    where type in ('friend_request', 'friend_accept')
    do nothing;
end;
$$;

-- 함수 권한: 시그니처가 바뀐 notify_entry_event는 새로 잠그고, notify_friend_event도 같은 상태로 맞춘다.
revoke all on function public.notify_entry_event(uuid, text, uuid) from public, anon;
grant execute on function public.notify_entry_event(uuid, text, uuid) to authenticated;
revoke all on function public.notify_friend_event(uuid, text) from public, anon;
grant execute on function public.notify_friend_event(uuid, text) to authenticated;

-- 3) finished_at 백필 -------------------------------------------------------------

update public.user_books ub
set finished_at = coalesce(
  (select max(e.created_at) from public.entries e where e.user_book_id = ub.id),
  ub.created_at
)
where ub.is_finished and ub.finished_at is null;

-- 4) badges·user_badges 삭제 -------------------------------------------------------

drop table if exists public.user_badges;
drop table if exists public.badges;
