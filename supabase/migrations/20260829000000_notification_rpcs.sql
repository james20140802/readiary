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
