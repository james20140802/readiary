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

  -- 댓글 알림 상한: 실제 댓글 수를 초과해 알림이 쌓이지 않도록 제한
  if p_type = 'comment' and (
    select count(*) from notifications
    where entry_id = p_entry_id and actor_id = v_actor and type = 'comment'
  ) >= (
    select count(*) from comments where entry_id = p_entry_id and user_id = v_actor
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
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from notifications
  where entry_id = p_entry_id
    and actor_id = auth.uid()
    and type = 'like'
    and read_at is null
    and created_at > now() - interval '10 minutes'
    and not exists (
      select 1 from likes where entry_id = p_entry_id and user_id = auth.uid()
    );
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
set search_path = public, pg_temp
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

  -- 재요청 스팸 방지: 같은 조합의 알림이 이미 있으면 스킵(읽음 여부 무관 —
  -- 읽은 뒤 RPC를 직접 재호출해 반복 생성하는 경로를 막는다)
  if exists (
    select 1 from notifications
    where user_id = p_recipient and actor_id = v_actor
      and type = p_type
  ) then
    return;
  end if;

  -- 동시 호출 레이스에도 중복 삽입되지 않도록 부분 유니크 인덱스에 기대 무시
  insert into notifications (user_id, actor_id, type)
  values (p_recipient, v_actor, p_type)
  on conflict (user_id, actor_id, type)
    where type in ('friend_request', 'friend_accept')
    do nothing;
end;
$$;

create index if not exists notifications_entry_actor_idx
  on public.notifications (entry_id, actor_id, type);

-- 친구 이벤트 알림 dedup을 레이스에도 보장하는 부분 유니크 인덱스.
-- 언프렌드 후 재요청 시에는 재알림이 발생하지 않지만, 요청 자체는
-- '받은 요청' 탭에서 확인 가능하므로 수용한다(Notion에 기록).
create unique index if not exists notifications_friend_event_unique
  on public.notifications (user_id, actor_id, type)
  where type in ('friend_request', 'friend_accept');

revoke all on function public.notify_entry_event(uuid, text) from public;
revoke all on function public.retract_like_notification(uuid) from public;
revoke all on function public.notify_friend_event(uuid, text) from public;
grant execute on function public.notify_entry_event(uuid, text) to authenticated;
grant execute on function public.retract_like_notification(uuid) to authenticated;
grant execute on function public.notify_friend_event(uuid, text) to authenticated;
