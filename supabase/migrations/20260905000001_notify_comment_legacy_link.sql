-- 댓글 알림 구형 경로 보강(2026-09-05): p_comment_id 없이 온 호출도 댓글 행에 알림을 매단다.
--
-- 20260905000000_db_followups는 "마이그레이션 먼저, 코드 나중" 순서로 배포한다. 그 사이의 옛 앱 인스턴스는
-- notify_entry_event를 댓글 id 없이 부르는데, 이전 정의는 그 경우 comment_id가 빈 알림을 만들었다.
-- 빈 알림은 댓글을 지워도 cascade로 사라지지 않고, 댓글 수 상한 검사에도 끼어 이후 정당한 알림을 막을 수 있었다.
--
-- 옛 코드는 댓글을 저장한 직후 이 함수를 부르므로, 호출자가 그 기록에 남긴 댓글 중 아직 알림이 매달리지 않은
-- 가장 최근 댓글이 방금 저장한 댓글이다. 구형 경로는 그 댓글을 찾아 새 경로와 같은 방식으로 알림을 만든다.
-- 댓글 수 상한 검사는 comment_id 부분 유니크 인덱스가 대신하므로 없앤다. (entry, actor) 어드바이저리 락은
-- 옛 코드가 댓글 두 개를 연달아 보낼 때 두 호출이 같은 댓글을 고르지 않도록 유지한다.
--
-- 시그니처는 그대로라 create or replace로 갱신하며, 권한은 명시적으로 다시 맞춘다.

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
  v_comment uuid := p_comment_id;
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

  if v_comment is not null then
    -- 새 경로: 댓글 행이 실제로 있고 호출자의 것이어야 한다
    if not exists (
      select 1 from comments
      where id = v_comment and entry_id = p_entry_id and user_id = v_actor
    ) then
      return;
    end if;
  else
    -- 구형 경로: 호출자가 이 기록에 남긴 댓글 중 알림이 아직 없는 가장 최근 댓글 = 방금 저장한 댓글.
    -- 연달아 온 두 호출이 같은 댓글을 고르지 않도록 (entry, actor) 단위로 직렬화한다.
    perform pg_advisory_xact_lock(
      hashtextextended('notify_comment:' || p_entry_id::text || ':' || v_actor::text, 0)
    );
    select c.id into v_comment
    from comments c
    where c.entry_id = p_entry_id and c.user_id = v_actor
      and not exists (select 1 from notifications n where n.comment_id = c.id)
    order by c.created_at desc, c.id desc
    limit 1;
    -- 매달 댓글이 없다: 댓글이 저장되지 않았거나 이미 전부 알림이 있다
    if v_comment is null then
      return;
    end if;
  end if;

  -- 알림은 댓글 행에 매달려 댓글이 지워지면 cascade로 함께 사라진다. 댓글당 알림은 하나뿐이다.
  insert into notifications (user_id, actor_id, type, entry_id, comment_id)
  values (v_recipient, v_actor, 'comment', p_entry_id, v_comment)
  on conflict (comment_id) where comment_id is not null do nothing;
end;
$$;

revoke all on function public.notify_entry_event(uuid, text, uuid) from public, anon;
grant execute on function public.notify_entry_event(uuid, text, uuid) to authenticated;
