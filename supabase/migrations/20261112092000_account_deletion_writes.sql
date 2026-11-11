-- 계정 탈퇴 3: 유예 중인 계정은 쓰지 못하고, 알림·이메일 발송 후보에서 빠진다.
-- 탈퇴를 신청해도 이미 발급된 접근 토큰은 최대 1시간가량 살아 있으므로, 앱이 아니라 DB가 쓰기를 거부한다.
-- 탈퇴 취소(cancel_account_deletion)는 이 차단과 상관없이 계속 된다. 취소하면 바로 다시 쓸 수 있다.
-- 서비스 롤 작업과 정의자 함수(request_account_deletion 등)는 RLS를 우회하므로 아래 정책의 영향을 받지 않는다.

-- 1) 사용자가 직접 쓰는 테이블마다, 이미 있는 명령(INSERT·UPDATE·DELETE)에 restrictive 정책을 하나씩 더한다.
--    기존 permissive 정책과 AND로 묶인다. 조건은 "지금 요청한 사람이 활성 계정인가"뿐이라 다른 사람의 쓰기에는 영향이 없다.
--    INSERT·UPDATE는 with check로 두어 42501 오류로 거부한다(UPDATE를 using으로 막으면 조용히 0행이 된다).
--    DELETE는 using만 쓸 수 있어 조용히 0행이 된다.
create policy book_registration_requests_insert_requires_active on public.book_registration_requests
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy books_insert_requires_active on public.books
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy comments_insert_requires_active on public.comments
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy comments_delete_requires_active on public.comments
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy entries_insert_requires_active on public.entries
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy entries_update_requires_active on public.entries
  as restrictive for update to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy entries_delete_requires_active on public.entries
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy entry_reflections_insert_requires_active on public.entry_reflections
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy entry_reflections_update_requires_active on public.entry_reflections
  as restrictive for update to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy entry_reflections_delete_requires_active on public.entry_reflections
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy friends_insert_requires_active on public.friends
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy friends_update_requires_active on public.friends
  as restrictive for update to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy friends_delete_requires_active on public.friends
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy likes_insert_requires_active on public.likes
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy likes_delete_requires_active on public.likes
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy monthly_excerpt_comments_insert_requires_active on public.monthly_excerpt_comments
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy monthly_excerpt_comments_delete_requires_active on public.monthly_excerpt_comments
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy monthly_excerpt_likes_insert_requires_active on public.monthly_excerpt_likes
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy monthly_excerpt_likes_delete_requires_active on public.monthly_excerpt_likes
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy monthly_excerpts_delete_requires_active on public.monthly_excerpts
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy notifications_update_requires_active on public.notifications
  as restrictive for update to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy notifications_delete_requires_active on public.notifications
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy profiles_insert_requires_active on public.profiles
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy profiles_update_requires_active on public.profiles
  as restrictive for update to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy push_subscriptions_delete_requires_active on public.push_subscriptions
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

create policy user_books_insert_requires_active on public.user_books
  as restrictive for insert to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy user_books_update_requires_active on public.user_books
  as restrictive for update to authenticated
  with check (public.is_account_active((select auth.uid())));

create policy user_books_delete_requires_active on public.user_books
  as restrictive for delete to authenticated
  using (public.is_account_active((select auth.uid())));

-- 유예 중인 독자에게는 새 친구 요청을 보낼 수 없다.
create policy friends_insert_requires_active_recipient on public.friends
  as restrictive for insert to authenticated
  with check (public.is_account_active(friend_id));

-- 2) 정의자 RPC는 RLS를 우회하므로 맨 앞에서 직접 확인한다. 본문·권한·search_path는 그대로 두고 확인 한 줄만 더한다.
create or replace function public.save_monthly_excerpt(p_month text, p_entry_ids uuid[], p_is_shared boolean)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_month date;
  v_shared boolean := coalesce(p_is_shared, false);
  v_stale jsonb;
  v_id uuid;
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
  if v_user is null then raise exception 'Authentication required'; end if;

  v_month := public.monthly_excerpt_month_start(p_month);
  if v_month >= date_trunc('month', public.monthly_excerpt_kst_today()::timestamp)::date then
    raise exception 'month_not_finished';
  end if;
  if coalesce(cardinality(p_entry_ids), 0) = 0 then raise exception 'no_entries'; end if;

  -- 확인과 저장 사이에 기록이 바뀌지 않게 잠근다. 동시에 고친 기록은 저장 뒤 트리거가 처리한다.
  perform 1 from public.entries e
  join public.user_books ub on ub.id = e.user_book_id
  where e.id = any (p_entry_ids) and ub.user_id = v_user
  for share of e;

  select jsonb_agg(s.id order by s.ord) into v_stale
  from (
    select u.id, min(u.ord) as ord
    from unnest(p_entry_ids) with ordinality as u(id, ord)
    group by u.id
    having count(*) > 1 or not exists (
      select 1 from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      where e.id = u.id
        and ub.user_id = v_user
        and e.date >= v_month and e.date < (v_month + interval '1 month')::date
        and e.quote ~ '[^[:space:]]'
    )
  ) s;
  if v_stale is not null then
    raise exception 'stale_entries' using detail = v_stale::text;
  end if;

  if v_shared and not exists (
    select 1 from public.entries e where e.id = any (p_entry_ids) and not e.is_private
  ) then
    raise exception 'no_public_quotes';
  end if;

  insert into public.monthly_excerpts as x (user_id, month, is_shared, first_shared_at)
  values (v_user, v_month, v_shared, case when v_shared then now() end)
  on conflict (user_id, month) do update
    set is_shared = excluded.is_shared,
        first_shared_at = case when excluded.is_shared then coalesce(x.first_shared_at, now()) else x.first_shared_at end,
        updated_at = now()
  returning x.id into v_id;

  -- unique(excerpt_id, position) 충돌을 피하려고 지운 뒤 넣는다.
  delete from public.monthly_excerpt_items i where i.excerpt_id = v_id;
  insert into public.monthly_excerpt_items (excerpt_id, entry_id, position)
  select v_id, u.id, u.ord::integer
  from unnest(p_entry_ids) with ordinality as u(id, ord);

  return v_id;
end;
$function$;
revoke all on function public.save_monthly_excerpt(text, uuid[], boolean) from public, anon;
grant execute on function public.save_monthly_excerpt(text, uuid[], boolean) to authenticated, service_role;

create or replace function public.set_monthly_excerpt_shared(p_id uuid, p_is_shared boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_shared boolean := coalesce(p_is_shared, false);
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
  if v_user is null then raise exception 'Authentication required'; end if;

  perform 1 from public.monthly_excerpts x where x.id = p_id and x.user_id = v_user for update;
  if not found then raise exception 'not_found'; end if;

  if v_shared and not exists (
    select 1 from public.monthly_excerpt_items i
    join public.entries e on e.id = i.entry_id
    where i.excerpt_id = p_id and not e.is_private
  ) then
    raise exception 'no_public_quotes';
  end if;

  update public.monthly_excerpts x
  set is_shared = v_shared,
      first_shared_at = case when v_shared then coalesce(x.first_shared_at, now()) else x.first_shared_at end,
      updated_at = now()
  where x.id = p_id;
end;
$function$;
revoke all on function public.set_monthly_excerpt_shared(uuid, boolean) from public, anon;
grant execute on function public.set_monthly_excerpt_shared(uuid, boolean) to authenticated, service_role;

create or replace function public.update_user_book_progress(p_book_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_book_id uuid;
  v_total_pages int;
  v_last_page int;
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'update_user_book_progress: not allowed' using errcode = '42501';
  end if;

  select ub.id, b.total_pages
    into v_user_book_id, v_total_pages
  from public.user_books ub
  join public.books b on b.id = ub.book_id
  where ub.book_id = p_book_id and ub.user_id = p_user_id;

  if v_user_book_id is null then
    return;
  end if;

  select max(e.to_page)
    into v_last_page
  from public.entries e
  where e.user_book_id = v_user_book_id and e.to_page is not null;

  update public.user_books
  set last_read_page = v_last_page,
      progress = case
        when v_last_page is null or v_total_pages is null or v_total_pages = 0 then null
        else least(100, round(v_last_page::numeric * 100 / v_total_pages))::int
      end
  where id = v_user_book_id;
end
$function$;
revoke all on function public.update_user_book_progress(uuid, uuid) from public, anon;
grant execute on function public.update_user_book_progress(uuid, uuid) to authenticated, service_role;

create or replace function public.notify_entry_event(p_entry_id uuid, p_type text, p_comment_id uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_recipient uuid;
  v_comment uuid := p_comment_id;
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
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
$function$;
revoke all on function public.notify_entry_event(uuid, text, uuid) from public, anon;
grant execute on function public.notify_entry_event(uuid, text, uuid) to authenticated, service_role;

create or replace function public.notify_friend_event(p_recipient uuid, p_type text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_friendship uuid;
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
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
$function$;
revoke all on function public.notify_friend_event(uuid, text) from public, anon;
grant execute on function public.notify_friend_event(uuid, text) to authenticated, service_role;

create or replace function public.notify_monthly_excerpt_event(p_excerpt_id uuid, p_type text, p_comment_id uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_recipient uuid;
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  if p_type is null or p_type not in ('excerpt_like', 'excerpt_comment') then
    raise exception 'invalid notification type: %', p_type;
  end if;
  if p_comment_id is not null and p_type <> 'excerpt_comment' then
    raise exception 'p_comment_id is only valid for comment notifications';
  end if;

  select x.user_id into v_recipient from public.monthly_excerpts x where x.id = p_excerpt_id;

  -- 권이 없거나 내 권이면 조용히 끝낸다.
  if v_recipient is null or v_recipient = v_actor then
    return;
  end if;
  if not public.can_view_monthly_excerpt(p_excerpt_id) then
    return;
  end if;

  if p_type = 'excerpt_like' then
    if not exists (
      select 1 from public.monthly_excerpt_likes l
      where l.excerpt_id = p_excerpt_id and l.user_id = v_actor
    ) then
      return;
    end if;
    insert into public.notifications (user_id, actor_id, type, monthly_excerpt_id)
    values (v_recipient, v_actor, 'excerpt_like', p_excerpt_id)
    on conflict (monthly_excerpt_id, actor_id) where type = 'excerpt_like' do nothing;
    return;
  end if;

  -- 댓글: 이 권에 내가 남긴 댓글이어야 한다. 알림은 댓글에 매달려 댓글을 지우면 함께 사라진다.
  if p_comment_id is null or not exists (
    select 1 from public.monthly_excerpt_comments c
    where c.id = p_comment_id and c.excerpt_id = p_excerpt_id and c.user_id = v_actor
  ) then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, type, monthly_excerpt_id, monthly_excerpt_comment_id)
  values (v_recipient, v_actor, 'excerpt_comment', p_excerpt_id, p_comment_id)
  on conflict (monthly_excerpt_comment_id) where monthly_excerpt_comment_id is not null do nothing;
end;
$function$;
revoke all on function public.notify_monthly_excerpt_event(uuid, text, uuid) from public, anon;
grant execute on function public.notify_monthly_excerpt_event(uuid, text, uuid) to authenticated, service_role;

create or replace function public.retract_like_notification(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
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
$function$;
revoke all on function public.retract_like_notification(uuid) from public, anon;
grant execute on function public.retract_like_notification(uuid) to authenticated, service_role;

create or replace function public.retract_monthly_excerpt_like_notification(p_excerpt_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := (select auth.uid());
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
  if v_actor is null then
    raise exception 'not authenticated';
  end if;
  delete from public.notifications n
  where n.monthly_excerpt_id = p_excerpt_id
    and n.actor_id = v_actor
    and n.type = 'excerpt_like'
    and n.read_at is null
    and n.created_at > now() - interval '10 minutes'
    and not exists (
      select 1 from public.monthly_excerpt_likes l
      where l.excerpt_id = p_excerpt_id and l.user_id = v_actor
    );
end;
$function$;
revoke all on function public.retract_monthly_excerpt_like_notification(uuid) from public, anon;
grant execute on function public.retract_monthly_excerpt_like_notification(uuid) to authenticated, service_role;

create or replace function public.save_push_preferences(p_enabled boolean, p_kinds text[], p_timezone text, p_hour integer, p_weekdays integer[])
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'invalid timezone'; end if;
 insert into public.push_preferences(user_id,enabled,kinds,timezone,hour,weekdays)
 values(auth.uid(),p_enabled,p_kinds,p_timezone,p_hour,p_weekdays)
 on conflict(user_id) do update set enabled=excluded.enabled,kinds=excluded.kinds,timezone=excluded.timezone,hour=excluded.hour,weekdays=excluded.weekdays,
 consent_at=case when not push_preferences.enabled and excluded.enabled then now() else push_preferences.consent_at end;
 if not p_enabled then
  delete from public.push_subscriptions where user_id=auth.uid();
  update public.push_deliveries set status='cancelled' where user_id=auth.uid() and status='claimed';
 end if;
end $function$;
revoke all on function public.save_push_preferences(boolean, text[], text, integer, integer[]) from public, anon;
grant execute on function public.save_push_preferences(boolean, text[], text, integer, integer[]) to authenticated, service_role;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if not exists(select 1 from public.push_preferences where user_id=auth.uid() and enabled) then raise exception 'consent required'; end if;
 if p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
 or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}=?$' or p_auth !~ '^[A-Za-z0-9_-]{22}={0,2}$' then raise exception 'invalid subscription'; end if;
 perform pg_advisory_xact_lock(hashtextextended('push-sub:'||auth.uid()::text,0));
 if (select count(*) from public.push_subscriptions where user_id=auth.uid()) >= 10 and not exists(select 1 from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid()) then raise exception 'device limit'; end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth
 where push_subscriptions.user_id=auth.uid();
 if not found then raise exception 'subscription already registered'; end if;
end $function$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated, service_role;

create or replace function public.mark_push_seen(p_kind text, p_delivery uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 -- Reading past deliveries remains available after notification opt-out.
 if p_delivery is not null then update public.push_deliveries set opened_at=now() where id=p_delivery and user_id=auth.uid(); end if;
 if not exists(select 1 from public.push_preferences where user_id=auth.uid() and enabled) then return; end if;
 if p_kind in ('friends','weekly','recall') then
  insert into public.push_seen(user_id,kind) values(auth.uid(),p_kind) on conflict(user_id,kind) do update set seen_at=now();
 end if;
 update public.push_preferences set seen_at=now() where user_id=auth.uid();
end $function$;
revoke all on function public.mark_push_seen(text, uuid) from public, anon;
grant execute on function public.mark_push_seen(text, uuid) to authenticated, service_role;

-- 3) 발송: 유예 중인 계정은 받는 사람 후보에서 빠지고, 그 계정의 활동은 다른 사람의 알림 근거가 되지 않는다.
--    발송 묶음(claim_push_batch)은 push_candidates가 빈 배열을 돌려주는 것으로도 빠지지만, 조건을 앞에 두어 후보 조회 자체를 줄인다.
create or replace function public.push_candidates(p_user uuid, p_now timestamp with time zone)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare p public.push_preferences; result jsonb='[]'; last_record timestamptz; last_kind timestamptz; b record; recalled record; cutoff timestamptz; local_day integer;
begin
 -- 유예 중인 계정에는 보내지 않는다.
 if not public.is_account_active(p_user) then return result; end if;
 select * into p from public.push_preferences where user_id=p_user and enabled;
 if not found then return result; end if;
 local_day=extract(dow from p_now at time zone p.timezone)::integer;
 select max(e.created_at) into last_record from public.entries e join public.user_books ub on ub.id=e.user_book_id where ub.user_id=p_user;
 if 'reminder'=any(p.kinds) and coalesce(last_record,p.consent_at)<=p_now-interval '3 days'
 and exists(select 1 from public.user_books where user_id=p_user and not is_finished)
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"reminder"}]')
 and (select count(*) from public.push_deliveries where user_id=p_user and created_at>greatest(coalesce(last_record,p.consent_at),p.seen_at) and items @> '[{"kind":"reminder"}]')<2 then
 result=result||jsonb_build_array(jsonb_build_object('kind','reminder','href','/books','label','읽고 있는 책에 한 문장 남겨볼까요?'));
 end if;
 if 'finished'=any(p.kinds) then
 for b in select ub.id,ub.book_id from public.user_books ub where ub.user_id=p_user and ub.is_finished and ub.finished_at>=p.consent_at and ub.finished_at<=p_now-interval '7 days'
 and not exists(select 1 from public.entries e where e.user_book_id=ub.id and e.created_at>=ub.finished_at and nullif(btrim(e.note),'') is not null)
 and not exists(select 1 from public.push_finished_receipts r where r.user_id=p_user and r.user_book_id=ub.id)
 order by ub.finished_at limit 5 loop
 result=result||jsonb_build_array(jsonb_build_object('kind','finished','book',b.id,'href','/books/'||b.book_id||'/entry/new','label','완독한 책의 여운을 남겨보세요'));
 end loop;
 end if;
 if 'weekly'=any(p.kinds) and local_day=0 and last_record>p_now-interval '7 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='weekly' and seen_at>p_now-interval '1 day')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"weekly"}]') then
 result=result||jsonb_build_array(jsonb_build_object('kind','weekly','href','/notifications/weekly','label','이번 주에 남긴 기록을 돌아보세요'));
 end if;
 if 'recall'=any(p.kinds) and p.consent_at<=p_now-interval '14 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='recall' and seen_at>p_now-interval '14 days')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '14 days' and items @> '[{"kind":"recall"}]') then
 select ent.id into recalled from public.entries ent join public.user_books ub on ub.id=ent.user_book_id
 where ub.user_id=p_user and ent.date<=(p_now at time zone p.timezone)::date-30 and nullif(btrim(ent.quote),'') is not null
 and not exists(select 1 from public.push_deliveries d where d.user_id=p_user and d.items @> jsonb_build_array(jsonb_build_object('entry',ent.id)))
 order by ent.date,ent.created_at,ent.id limit 1;
 if found then result=result||jsonb_build_array(jsonb_build_object('kind','recall','entry',recalled.id,'href','/entry/'||recalled.id,'label','예전에 남긴 문장을 다시 만나보세요')); end if;
 end if;
 if 'friends'=any(p.kinds) and local_day=3
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"friends"}]') then
 select greatest(p.consent_at,p_now-interval '7 days',coalesce((select seen_at from public.push_seen where user_id=p_user and kind='friends'),p.consent_at)) into cutoff;
 -- 유예 중인 친구가 남긴 기록은 세지 않는다.
 if exists(select 1 from public.entries ent join public.user_books ub on ub.id=ent.user_book_id where not ent.is_private and ent.created_at>cutoff
 and public.is_account_active(ub.user_id)
 and exists(select 1 from public.friends f where f.status='accepted' and ((f.user_id=p_user and f.friend_id=ub.user_id) or (f.friend_id=p_user and f.user_id=ub.user_id)))) then
 result=result||jsonb_build_array(jsonb_build_object('kind','friends','href','/social','label','친구들이 새 기록을 남겼어요'));
 end if;
 end if;
 return result;
end $function$;
revoke all on function public.push_candidates(uuid, timestamp with time zone) from public, anon;
grant execute on function public.push_candidates(uuid, timestamp with time zone) to service_role;

create or replace function public.claim_push_batch(p_limit integer default 20)
returns setof push_deliveries
language plpgsql
set search_path to ''
as $function$
declare p record; items jsonb; claimed public.push_deliveries; n timestamptz=now();
begin
 -- No cleanup of ambiguous claims: they consume the budget and are never re-sent.
 delete from public.push_deliveries where created_at<n-interval '90 days';
 for p in select * from public.push_preferences pref where enabled
 and public.is_account_active(pref.user_id)
 and extract(hour from n at time zone timezone)::integer=hour
 and extract(dow from n at time zone timezone)::integer=any(weekdays)
 and exists(select 1 from public.push_subscriptions s where s.user_id=pref.user_id)
 and not exists(select 1 from public.push_deliveries d where d.user_id=pref.user_id and d.created_at>n-interval '48 hours')
 and (select count(*) from public.push_deliveries d where d.user_id=pref.user_id and d.created_at>n-interval '7 days')<2
 and public.push_candidates(pref.user_id,n)<>'[]'::jsonb
 order by (select max(created_at) from public.push_deliveries d where d.user_id=pref.user_id) nulls first,pref.user_id
 limit least(greatest(p_limit,1),100) for update skip locked loop
 items=public.push_candidates(p.user_id,n);
 if jsonb_array_length(items)=0 then continue; end if;
 insert into public.push_deliveries(user_id,items) values(p.user_id,items) returning * into claimed;
 insert into public.push_finished_receipts(user_id,user_book_id) select p.user_id,(x->>'book')::uuid from jsonb_array_elements(items) x where x->>'kind'='finished' on conflict do nothing;
 return next claimed;
 end loop;
end $function$;
revoke all on function public.claim_push_batch(integer) from public, anon;
grant execute on function public.claim_push_batch(integer) to service_role;

create or replace function public.claim_marketing_email(p_user uuid, p_id uuid, p_content_hash text, p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare u auth.users; p public.email_preferences; d public.email_deliveries;
begin
 -- 유예 중인 계정에는 보내지 않는다.
 if not public.is_account_active(p_user) then return null; end if;
 select * into u from auth.users where id=p_user for update;
 if not found then return null; end if;
 select * into p from public.email_preferences where user_id=p_user;
 if not coalesce(p.enabled,false) or u.email_confirmed_at is null or u.email is distinct from p.email then return null; end if;
 select * into d from public.email_deliveries where id=p_id;
 if found then
  if d.user_id<>p_user or d.content_hash<>p_content_hash or d.token_hash<>p_token_hash
   or d.email<>p.email or d.preference_version<>p.version then raise exception 'delivery_conflict'; end if;
  if d.status='sent' then return jsonb_build_object('sent',true,'provider_id',d.provider_id); end if;
  if d.first_attempt_at < now()-interval '23 hours' then raise exception 'delivery_needs_review'; end if;
  if d.last_attempt_at > now()-interval '2 minutes' then return null; end if;
  update public.email_deliveries set status='sending',last_attempt_at=now() where id=p_id;
 else
  insert into public.email_deliveries(id,user_id,email,content_hash,token_hash,preference_version,status)
  values(p_id,p_user,p.email,p_content_hash,p_token_hash,p.version,'sending');
 end if;
 return jsonb_build_object('email',p.email,'version',p.version);
end $function$;
revoke all on function public.claim_marketing_email(uuid, uuid, text, text) from public, anon;
grant execute on function public.claim_marketing_email(uuid, uuid, text, text) to service_role;
