-- 문장 토론 알림(2차). 기존 notifications 테이블에 종류 넷을 더한다.
--   debate_answer  발제자에게: 내 토론에 답이 달렸다(답마다)
--   debate_reply   답 쓴 사람에게: 내 답에 답글이 달렸다(발제자가 단 답글도)
--   debate_move    답 쓴 사람에게: 내 답에 "생각이 바뀌었어요"가 눌렸다(답마다 하루에 한 번)
--   debate_summary 그 토론에 답한 사람들에게: 토론이 정리됐다(발제자 제외)
-- 좋아요·댓글 알림과 같은 방식이다. 쓰기 RPC는 그대로 두고, 화면이 쓰기 뒤에 notify_debate_event를 부른다.
-- 수신자는 DB가 정하고 사실(내가 남긴 답, 내가 누른 표시, 내가 정리한 토론)이 있어야 만든다.
-- 받은 사람이 지금 볼 수 없는 토론·답의 알림은 지우지 않고 읽을 때 가린다. 다시 보이면 돌아온다.
-- 새 열·인덱스·함수를 더하고 알림 종류를 넓히기만 하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다.
begin;

-- debate_id: 토론이 지워지면 알림도 사라진다.
-- debate_answer_id: 알림이 가리키는 답·답글. 그 행이 지워지면 알림도 사라진다.
alter table public.notifications
  add column debate_id uuid references public.debates (id) on delete cascade,
  add column debate_answer_id uuid references public.debate_answers (id) on delete cascade;

-- 이름은 그대로 두고 종류만 넓힌다. 기존 값은 모두 새 목록에 있어 옛 코드의 쓰기는 그대로 통과한다.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'friend_request', 'friend_accept', 'like', 'comment', 'excerpt_like', 'excerpt_comment',
    'debate_answer', 'debate_reply', 'debate_move', 'debate_summary'
  )
);

-- 답·답글 알림은 그 행마다 하나다. 재시도와 동시 호출을 막는다.
create unique index notifications_debate_answer_event_unique
  on public.notifications (debate_answer_id)
  where type in ('debate_answer', 'debate_reply');
-- 생각이 바뀌었어요는 답마다 하루(한국 날짜)에 하나로 묶는다. 켜고 끄기를 되풀이해도 늘지 않는다.
create unique index notifications_debate_move_daily_unique
  on public.notifications (debate_answer_id, ((created_at at time zone 'Asia/Seoul')::date))
  where type = 'debate_move';
-- 정리 알림은 토론마다 받는 사람당 하나다. 정리를 고쳐도 다시 알리지 않는다.
create unique index notifications_debate_summary_unique
  on public.notifications (debate_id, user_id)
  where type = 'debate_summary';
-- 토론 삭제의 cascade가 알림을 빠르게 찾도록 둔다.
create index notifications_debate_id_idx
  on public.notifications (debate_id)
  where debate_id is not null;

-- 받은 사람이 지금 이 알림을 봐도 되는가: 토론을 볼 수 있고, 답이 걸려 있으면 그 답이 남아 있고 보여야 한다.
-- 볼 수 있는지는 토론 화면과 같은 함수(can_view_debate, debate_can_see_answer)가 정한다.
create function public.can_see_debate_notification(p_debate_id uuid, p_answer_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_view_debate(p_debate_id)
    and (
      p_answer_id is null
      or exists (
        select 1 from public.debate_answers a
        where a.id = p_answer_id and a.debate_id = p_debate_id and a.deleted_at is null
          and public.debate_can_see_answer(a.debate_id, a.user_id, a.hidden_at)
      )
    );
$$;
revoke all on function public.can_see_debate_notification(uuid, uuid) from public, anon;
grant execute on function public.can_see_debate_notification(uuid, uuid) to authenticated, service_role;

-- 친구가 아니게 됐거나, 답글이 숨겨졌거나, 답이 자리만 남았으면 그 알림은 목록과 안 읽은 표시에서 빠진다.
create policy notifications_hide_unviewable_debate on public.notifications
  as restrictive for select to authenticated
  using (debate_id is null or public.can_see_debate_notification(debate_id, debate_answer_id));

-- p_target: debate_answer·debate_reply는 방금 남긴 답·답글, debate_move는 누른 답, debate_summary는 정리한 토론.
create function public.notify_debate_event(p_type text, p_target uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_row record;
  v_owner uuid;
  v_recipient uuid;
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_type is null or p_type not in ('debate_answer', 'debate_reply', 'debate_move', 'debate_summary') then
    raise exception 'invalid_type';
  end if;

  if p_type = 'debate_summary' then
    -- 내가 정리해 닫은 토론이어야 한다. 지금 보이는 답을 남긴 사람마다 한 번 알린다.
    if not exists (
      select 1 from public.debates d
      where d.id = p_target and d.user_id = v_actor and d.closed_at is not null
    ) then
      return;
    end if;
    insert into public.notifications (user_id, actor_id, type, debate_id)
    select distinct a.user_id, v_actor, 'debate_summary', p_target
    from public.debate_answers a
    where a.debate_id = p_target and a.parent_id is null and a.deleted_at is null and a.hidden_at is null
      and a.user_id <> v_actor and public.is_account_active(a.user_id)
    on conflict (debate_id, user_id) where type = 'debate_summary' do nothing;
    return;
  end if;

  select a.id, a.debate_id, a.user_id, a.parent_id into v_row
  from public.debate_answers a
  where a.id = p_target and a.deleted_at is null and a.hidden_at is null;
  -- 답이 없거나 숨겨졌거나, 내가 볼 수 없는 토론이면 조용히 끝낸다.
  if not found or not public.can_view_debate(v_row.debate_id) then return; end if;

  if p_type = 'debate_move' then
    -- 답글에는 표시가 없다. 실제로 눌러 둔 표시가 있어야 한다.
    if v_row.parent_id is not null or v_row.user_id = v_actor or not exists (
      select 1 from public.debate_moves m where m.answer_id = p_target and m.user_id = v_actor
    ) then
      return;
    end if;
    insert into public.notifications (user_id, actor_id, type, debate_id, debate_answer_id)
    values (v_row.user_id, v_actor, 'debate_move', v_row.debate_id, p_target)
    on conflict (debate_answer_id, ((created_at at time zone 'Asia/Seoul')::date)) where type = 'debate_move'
    do nothing;
    return;
  end if;

  -- 답·답글: 내가 남긴 행이어야 하고, 종류와 모양(답글이면 부모가 있다)이 맞아야 한다.
  if v_row.user_id <> v_actor or (p_type = 'debate_reply') <> (v_row.parent_id is not null) then return; end if;
  if p_type = 'debate_answer' then
    select d.user_id into v_recipient from public.debates d where d.id = v_row.debate_id;
  else
    select a.user_id into v_recipient from public.debate_answers a
    where a.id = v_row.parent_id and a.deleted_at is null;
  end if;
  if v_recipient is null or v_recipient = v_actor then return; end if;
  insert into public.notifications (user_id, actor_id, type, debate_id, debate_answer_id)
  values (v_recipient, v_actor, p_type, v_row.debate_id, p_target)
  on conflict (debate_answer_id) where type in ('debate_answer', 'debate_reply') do nothing;
end;
$$;
revoke all on function public.notify_debate_event(text, uuid) from public, anon;
grant execute on function public.notify_debate_event(text, uuid) to authenticated, service_role;

-- 알림 거두기.
--   debate_move: 표시를 곧바로 거뒀을 때 안 읽은 알림을 거둔다(retract_like_notification과 같은 조건).
--   debate_summary: 발제자가 정리를 지워 토론을 다시 열었을 때 정리 알림을 거둔다. 다시 정리하면 다시 알린다.
create function public.retract_debate_notification(p_type text, p_target uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  perform public.assert_account_active();
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_type = 'debate_move' then
    delete from public.notifications n
    where n.debate_answer_id = p_target
      and n.actor_id = v_actor
      and n.type = 'debate_move'
      and n.read_at is null
      and n.created_at > now() - interval '10 minutes'
      and not exists (
        select 1 from public.debate_moves m where m.answer_id = p_target and m.user_id = v_actor
      );
  elsif p_type = 'debate_summary' then
    delete from public.notifications n
    where n.debate_id = p_target
      and n.type = 'debate_summary'
      and exists (
        select 1 from public.debates d
        where d.id = p_target and d.user_id = v_actor and d.closed_at is null
      );
  else
    raise exception 'invalid_type';
  end if;
end;
$$;
revoke all on function public.retract_debate_notification(text, uuid) from public, anon;
grant execute on function public.retract_debate_notification(text, uuid) to authenticated, service_role;

commit;
