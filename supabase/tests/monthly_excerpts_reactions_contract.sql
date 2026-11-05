-- 달의 발췌집 좋아요·댓글·알림 계약. 메모리 안의 격리된 DB에서만 실행하고, 실패는 raise exception으로 알린다.
-- 실행기(db.exec)는 파일 전체를 한 트랜잭션으로 보내므로, 트랜잭션 끝에 도는 deferred trigger는
-- `set constraints all immediate`로 그 자리에서 돌려 확인한다.
--
-- 역할: A(…001)는 주인, C(…003)·F(…006)는 수락된 친구, D(…004)는 친구가 아니다.

-- ── 테스트 도구 ──────────────────────────────────────────────
create schema t;
grant usage on schema t to authenticated, anon;

create function t.as_user(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, false);
$$;

create function t.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '', false);
$$;

create function t.eq(p_label text, p_got jsonb, p_want jsonb) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: got % want %', p_label, p_got, p_want;
  end if;
end;
$$;

-- 문장을 실행해 결과 코드를 돌려준다. 성공은 ok다.
create function t.state_of(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;

-- 지금 역할로 지운 행 수(RLS 적용).
create function t.deleted(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

create function t.excerpt_id(p_user uuid, p_month date) returns uuid language sql security definer as $$
  select id from public.monthly_excerpts where user_id = p_user and month = p_month;
$$;

-- 지금 역할이 보는 행 수(RLS 적용).
create function t.visible_likes(p_id uuid) returns int language sql as $$
  select count(*)::int from public.monthly_excerpt_likes where excerpt_id = p_id;
$$;
create function t.visible_comments(p_id uuid) returns int language sql as $$
  select count(*)::int from public.monthly_excerpt_comments where excerpt_id = p_id;
$$;

-- 실제로 남아 있는 행 수와 알림 수(RLS 무시).
create function t.real_likes(p_id uuid) returns int language sql security definer as $$
  select count(*)::int from public.monthly_excerpt_likes where excerpt_id = p_id;
$$;
create function t.real_comments(p_id uuid) returns int language sql security definer as $$
  select count(*)::int from public.monthly_excerpt_comments where excerpt_id = p_id;
$$;
create function t.notifs(p_id uuid, p_type text) returns int language sql security definer as $$
  select count(*)::int from public.notifications where monthly_excerpt_id = p_id and type = p_type;
$$;

-- ── 자료 ────────────────────────────────────────────────────
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000006');
insert into public.profiles(id, name, nickname, tag) select id, 'Test', id::text, '0001' from auth.users;
insert into public.books(id, title, author) values
  ('00000000-0000-4000-8000-000000000010', '공개 책', '지은이');
insert into public.user_books(id, user_id, book_id) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010');
insert into public.friends(user_id, friend_id, status, accepted_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'accepted', now()),
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'accepted', now());
insert into public.entries(id, user_book_id, date, quote, note, is_private) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000011', '2026-03-01', '삼월 문장 하나', null, false),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000011', '2026-03-02', '삼월 문장 둘', null, false),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000011', '2026-02-02', '이월 문장', null, false),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000011', '2026-01-02', '일월 문장', null, false);

-- ── 권한과 정의 ─────────────────────────────────────────────
do $$
declare
  fn text;
  tbl text;
  v_bad text;
begin
  foreach tbl in array array['public.monthly_excerpt_likes', 'public.monthly_excerpt_comments'] loop
    if has_table_privilege('anon', tbl, 'select') or has_table_privilege('anon', tbl, 'insert') then
      raise exception 'anon must not touch %', tbl;
    end if;
    if not (has_table_privilege('authenticated', tbl, 'select')
        and has_table_privilege('authenticated', tbl, 'insert')
        and has_table_privilege('authenticated', tbl, 'delete')) then
      raise exception 'authenticated needs select/insert/delete on %', tbl;
    end if;
    -- 반응은 고치지 않는다. 지우고 다시 남긴다.
    if has_table_privilege('authenticated', tbl, 'update') then
      raise exception 'authenticated must not update %', tbl;
    end if;
    if not has_table_privilege('service_role', tbl, 'select') then
      raise exception 'service_role needs %', tbl;
    end if;
    if not (select relrowsecurity from pg_class where oid = tbl::regclass) then
      raise exception 'RLS off on %', tbl;
    end if;
  end loop;

  foreach fn in array array[
    'public.notify_monthly_excerpt_event(uuid,text,uuid)',
    'public.retract_monthly_excerpt_like_notification(uuid)',
    'public.get_monthly_excerpt_reactions(uuid)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;

  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('notify_monthly_excerpt_event', 'retract_monthly_excerpt_like_notification',
                      'get_monthly_excerpt_reactions')
    and (not p.prosecdef or not coalesce(p.proconfig @> array['search_path=""'], false));
  if v_bad is not null then raise exception 'must be definer with empty search_path: %', v_bad; end if;

  -- 옛 코드가 쓰는 알림 종류는 그대로 들어간다.
  perform 1 from pg_constraint
  where conname = 'notifications_type_check'
    and pg_get_constraintdef(oid) like '%friend_request%'
    and pg_get_constraintdef(oid) like '%friend_accept%'
    and pg_get_constraintdef(oid) like '%''like''%'
    and pg_get_constraintdef(oid) like '%''comment''%'
    and pg_get_constraintdef(oid) like '%excerpt_like%'
    and pg_get_constraintdef(oid) like '%excerpt_comment%';
  if not found then raise exception 'type check must keep old types and add new ones'; end if;
end $$;

-- ── A가 엮는다: 3월(공개), 2월(공개, 지우기용), 1월(공개, 기록이 모두 사라지는 경우) ─
set role authenticated;
select t.as_user('00000000-0000-4000-8000-000000000001');
select public.save_monthly_excerpt('2026-03', array[
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102'
]::uuid[], true);
select public.save_monthly_excerpt('2026-02', array['00000000-0000-4000-8000-000000000103']::uuid[], true);
select public.save_monthly_excerpt('2026-01', array['00000000-0000-4000-8000-000000000104']::uuid[], true);
set constraints all immediate;
set constraints all deferred;
reset role;

-- ── 친구의 좋아요: 소유자에게 알림 1건, 토글을 반복해도 1건 ─
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  c uuid := '00000000-0000-4000-8000-000000000003';
  x uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user(c);
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (c, x);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('friend like notifies once', to_jsonb(t.notifs(x, 'excerpt_like')), '1');
  -- 같은 호출이 또 와도 1건이다.
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('repeat notify keeps one', to_jsonb(t.notifs(x, 'excerpt_like')), '1');

  -- 좋아요 행이 남아 있으면 회수하지 않는다.
  perform public.retract_monthly_excerpt_like_notification(x);
  perform t.eq('retract needs the like gone', to_jsonb(t.notifs(x, 'excerpt_like')), '1');

  -- 취소하고 회수, 다시 누르면 다시 1건.
  delete from public.monthly_excerpt_likes where user_id = c and excerpt_id = x;
  perform public.retract_monthly_excerpt_like_notification(x);
  perform t.eq('unlike retracts', to_jsonb(t.notifs(x, 'excerpt_like')), '0');
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (c, x);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('relike notifies once', to_jsonb(t.notifs(x, 'excerpt_like')), '1');

  -- 회수 없이 취소·재좋아요를 반복해도 부분 유니크 인덱스가 1건으로 막는다.
  delete from public.monthly_excerpt_likes where user_id = c and excerpt_id = x;
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (c, x);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('toggle without retract keeps one', to_jsonb(t.notifs(x, 'excerpt_like')), '1');

  -- 한 사람이 같은 권에 좋아요를 두 번 남길 수 없다.
  perform t.eq('like is unique', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (%L, %L)', c, x))), '"23505"');

  -- 다른 친구의 좋아요는 따로 1건이다.
  perform t.as_user('00000000-0000-4000-8000-000000000006');
  insert into public.monthly_excerpt_likes(user_id, excerpt_id)
    values ('00000000-0000-4000-8000-000000000006', x);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('second friend adds one', to_jsonb(t.notifs(x, 'excerpt_like')), '2');
  delete from public.monthly_excerpt_likes where user_id = '00000000-0000-4000-8000-000000000006' and excerpt_id = x;
  perform public.retract_monthly_excerpt_like_notification(x);
  perform t.eq('second friend retracts only theirs', to_jsonb(t.notifs(x, 'excerpt_like')), '1');
end $$;
reset role;

-- 읽은 알림은 회수하지 않는다(기록 좋아요와 같다).
update public.notifications set read_at = now()
where type = 'excerpt_like' and actor_id = '00000000-0000-4000-8000-000000000003';
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  c uuid := '00000000-0000-4000-8000-000000000003';
  x uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user(c);
  delete from public.monthly_excerpt_likes where user_id = c and excerpt_id = x;
  perform public.retract_monthly_excerpt_like_notification(x);
  perform t.eq('read notification stays', to_jsonb(t.notifs(x, 'excerpt_like')), '1');
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (c, x);

  -- 알림은 기록이 아니라 권을 가리키고, 수신자는 소유자다.
  perform t.as_user(a);
  perform t.eq('owner reads the notification',
    (select to_jsonb(count(*)::int) from public.notifications
     where monthly_excerpt_id = x and entry_id is null and user_id = a and actor_id = c),
    '1');
  perform t.as_user(c);
  perform t.eq('actor cannot read it',
    (select to_jsonb(count(*)::int) from public.notifications where monthly_excerpt_id = x), '0');
end $$;
reset role;

-- ── 친구의 댓글과 답글 ──────────────────────────────────────
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  c uuid := '00000000-0000-4000-8000-000000000003';
  f uuid := '00000000-0000-4000-8000-000000000006';
  x uuid := t.excerpt_id(a, '2026-03-01');
  other uuid := t.excerpt_id(a, '2026-02-01');
  c1 uuid := '00000000-0000-4000-8000-00000000c001';
  c2 uuid := '00000000-0000-4000-8000-00000000c002';
  c3 uuid := '00000000-0000-4000-8000-00000000c003';
  c4 uuid := '00000000-0000-4000-8000-00000000c004';
begin
  perform t.as_user(c);
  insert into public.monthly_excerpt_comments(id, excerpt_id, user_id, content, client_comment_id)
    values (c1, x, c, '좋은 달이네요', c1);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment', c1);
  perform t.eq('comment notifies once', to_jsonb(t.notifs(x, 'excerpt_comment')), '1');
  -- 재시도가 같은 댓글로 또 불러도 1건이다.
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment', c1);
  perform t.eq('retry keeps one', to_jsonb(t.notifs(x, 'excerpt_comment')), '1');

  -- 같은 사용자의 멱등 키는 한 번만 쓴다.
  perform t.eq('client id is unique per user', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_comments(excerpt_id, user_id, content, client_comment_id) values (%L, %L, %L, %L)',
    x, c, '또', c1))), '"23505"');

  -- 답글은 같은 권의 댓글에만 달린다.
  perform t.eq('parent in another excerpt is refused', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_comments(excerpt_id, user_id, content, parent_id) values (%L, %L, %L, %L)',
    other, c, '다른 권', c1))), '"23503"');
  perform t.eq('missing parent is refused', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_comments(excerpt_id, user_id, content, parent_id) values (%L, %L, %L, %L)',
    x, c, '없는 부모', c4))), '"23503"');
  insert into public.monthly_excerpt_comments(id, excerpt_id, user_id, content, parent_id)
    values (c2, x, c, '답글', c1);

  -- 검증: 남의 댓글, 다른 권의 댓글, 댓글 id 없음은 알림을 만들지 않는다.
  perform t.as_user(f);
  -- 아직 알림이 없는 댓글로 확인한다. 이미 알림이 있으면 유니크 인덱스가 먼저 막아 검증을 시험하지 못한다.
  perform t.as_user(c);
  insert into public.monthly_excerpt_comments(id, excerpt_id, user_id, content) values (c4, x, c, '알림 없는 댓글');
  perform t.as_user(f);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment', c4);
  perform t.eq('someone else''s comment makes no notification', to_jsonb(t.notifs(x, 'excerpt_comment')), '1');
  perform t.as_user(c);
  perform public.notify_monthly_excerpt_event(other, 'excerpt_comment', c4);
  perform t.eq('comment of another excerpt makes no notification', to_jsonb(t.notifs(other, 'excerpt_comment')), '0');
  delete from public.monthly_excerpt_comments where id = c4;
  perform t.as_user(f);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment');
  perform t.eq('no comment id makes no notification', to_jsonb(t.notifs(x, 'excerpt_comment')), '1');
  -- 좋아요를 누르지 않고 좋아요 알림을 위조할 수 없다.
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('forged like makes no notification', to_jsonb(t.notifs(x, 'excerpt_like')), '1');

  -- 잘못된 호출은 예외다.
  perform t.eq('bad type raises', to_jsonb(t.state_of(format(
    'select public.notify_monthly_excerpt_event(%L, %L)', x, 'like'))), '"P0001"');
  perform t.eq('comment id with like raises', to_jsonb(t.state_of(format(
    'select public.notify_monthly_excerpt_event(%L, %L, %L)', x, 'excerpt_like', c1))), '"P0001"');
  perform t.as_anon();
  perform t.eq('no session raises', to_jsonb(t.state_of(format(
    'select public.notify_monthly_excerpt_event(%L, %L)', x, 'excerpt_like'))), '"P0001"');

  -- 지우기: 본인 댓글만. 기존 댓글 규칙(comments_delete_own)과 같아서 소유자도 남의 댓글은 못 지운다.
  perform t.as_user(f);
  perform t.eq('friend cannot delete another comment', to_jsonb(t.deleted(format(
    'delete from public.monthly_excerpt_comments where id = %L', c1))), '0');
  perform t.as_user(a);
  perform t.eq('owner cannot delete another comment', to_jsonb(t.deleted(format(
    'delete from public.monthly_excerpt_comments where id = %L', c1))), '0');
  perform t.eq('owner reads comments', to_jsonb(t.visible_comments(x)), '2');

  -- 내 댓글을 지우면 답글과 알림이 함께 사라진다.
  perform t.as_user(c);
  insert into public.monthly_excerpt_comments(id, excerpt_id, user_id, content) values (c3, x, c, '지울 댓글');
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment', c3);
  perform t.eq('second comment notifies', to_jsonb(t.notifs(x, 'excerpt_comment')), '2');
  insert into public.monthly_excerpt_comments(excerpt_id, user_id, content, parent_id) values (x, c, '답글', c3);
  perform t.eq('own comment deleted', to_jsonb(t.deleted(format(
    'delete from public.monthly_excerpt_comments where id = %L', c3))), '1');
  perform t.eq('reply cascades', to_jsonb(t.real_comments(x)), '2');
  perform t.eq('notification cascades with the comment', to_jsonb(t.notifs(x, 'excerpt_comment')), '1');
end $$;
reset role;

-- ── 자기 반응은 알림이 없다 ─────────────────────────────────
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  x uuid := t.excerpt_id(a, '2026-02-01');
  mine uuid := '00000000-0000-4000-8000-00000000c010';
begin
  perform t.as_user(a);
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (a, x);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  insert into public.monthly_excerpt_comments(id, excerpt_id, user_id, content) values (mine, x, a, '내 댓글');
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment', mine);
  perform t.eq('own like silent', to_jsonb(t.notifs(x, 'excerpt_like')), '0');
  perform t.eq('own comment silent', to_jsonb(t.notifs(x, 'excerpt_comment')), '0');
end $$;
reset role;

-- ── 친구가 아니면 읽지도 남기지도 못한다 ────────────────────
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  d uuid := '00000000-0000-4000-8000-000000000004';
  x uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user(d);
  perform t.eq('stranger reads no likes', to_jsonb(t.visible_likes(x)), '0');
  perform t.eq('stranger reads no comments', to_jsonb(t.visible_comments(x)), '0');
  perform t.eq('stranger cannot like', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (%L, %L)', d, x))), '"42501"');
  perform t.eq('stranger cannot comment', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_comments(excerpt_id, user_id, content) values (%L, %L, %L)', x, d, '안녕'))), '"42501"');
  perform t.eq('stranger reads no counts', public.get_monthly_excerpt_reactions(x), null);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('stranger makes no notification', to_jsonb(t.notifs(x, 'excerpt_like')), '1');

  -- 남의 이름으로 남길 수 없다.
  perform t.as_user('00000000-0000-4000-8000-000000000006');
  perform t.eq('cannot like as someone else', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (%L, %L)', d, x))), '"42501"');
end $$;
reset role;

-- ── 수 ───────────────────────────────────────────────────────
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  x uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('friend counts', public.get_monthly_excerpt_reactions(x),
    '{"liked": true, "likeCount": 1, "commentCount": 2}');
  perform t.as_user('00000000-0000-4000-8000-000000000006');
  perform t.eq('other friend counts', public.get_monthly_excerpt_reactions(x),
    '{"liked": false, "likeCount": 1, "commentCount": 2}');
  perform t.as_user(a);
  perform t.eq('owner counts', public.get_monthly_excerpt_reactions(x),
    '{"liked": false, "likeCount": 1, "commentCount": 2}');
end $$;
reset role;

-- ── 문장을 고쳐도 반응은 그대로다 ───────────────────────────
set role authenticated;
select t.as_user('00000000-0000-4000-8000-000000000001');
select public.save_monthly_excerpt('2026-03', array['00000000-0000-4000-8000-000000000102']::uuid[], true);
set constraints all immediate;
set constraints all deferred;
do $$
declare x uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01');
begin
  perform t.eq('likes survive editing', to_jsonb(t.real_likes(x)), '1');
  perform t.eq('comments survive editing', to_jsonb(t.real_comments(x)), '2');
end $$;
reset role;

-- ── 나만 보기: 친구는 읽지도 남기지도 못하고, 소유자는 읽고, 행은 남는다 ─
set role authenticated;
select t.as_user('00000000-0000-4000-8000-000000000001');
select public.set_monthly_excerpt_shared(t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01'), false);
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  c uuid := '00000000-0000-4000-8000-000000000003';
  f uuid := '00000000-0000-4000-8000-000000000006';
  x uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user(c);
  perform t.eq('hidden: no likes for friend', to_jsonb(t.visible_likes(x)), '0');
  perform t.eq('hidden: no comments for friend', to_jsonb(t.visible_comments(x)), '0');
  perform t.eq('hidden: no counts for friend', public.get_monthly_excerpt_reactions(x), null);
  perform t.as_user(f);
  perform t.eq('hidden: cannot like', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (%L, %L)', f, x))), '"42501"');
  perform t.eq('hidden: cannot comment', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_comments(excerpt_id, user_id, content) values (%L, %L, %L)', x, f, '안녕'))), '"42501"');

  -- 자기 반응도 숨겨진 동안에는 지울 수 없다. 조건 없는 delete도 마찬가지다.
  perform t.as_user(c);
  perform t.eq('hidden: like stays', to_jsonb(t.deleted(format(
    'delete from public.monthly_excerpt_likes where user_id = %L', c))), '0');
  perform t.eq('hidden: bare delete of likes removes none', to_jsonb(t.deleted(
    'delete from public.monthly_excerpt_likes')), '0');
  perform t.eq('hidden: bare delete of comments removes none', to_jsonb(t.deleted(
    'delete from public.monthly_excerpt_comments')), '0');

  -- 숨겨진 동안에는 알림을 다시 만들 수 없다. 알림을 지운 뒤 RPC를 직접 불러도 마찬가지다.
  perform t.as_user(a);
  delete from public.notifications where monthly_excerpt_id = x and type = 'excerpt_like';
  perform t.as_user(c);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  perform t.eq('hidden: no new notification', to_jsonb(t.notifs(x, 'excerpt_like')), '0');

  perform t.as_user(a);
  perform t.eq('hidden: owner reads likes', to_jsonb(t.visible_likes(x)), '1');
  perform t.eq('hidden: owner reads comments', to_jsonb(t.visible_comments(x)), '2');
  perform t.eq('hidden: owner counts', public.get_monthly_excerpt_reactions(x),
    '{"liked": false, "likeCount": 1, "commentCount": 2}');
  perform t.eq('hidden: rows kept', to_jsonb(t.real_likes(x) + t.real_comments(x)), '3');
end $$;

-- 다시 보여 주면 반응이 돌아온다.
select public.set_monthly_excerpt_shared(t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01'), true);
do $$
declare
  x uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01');
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('shared again: likes back', to_jsonb(t.visible_likes(x)), '1');
  perform t.eq('shared again: comments back', to_jsonb(t.visible_comments(x)), '2');
end $$;
reset role;

-- ── 공개 문장이 없어도 같다 ─────────────────────────────────
update public.entries set is_private = true where id = '00000000-0000-4000-8000-000000000102';
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  f uuid := '00000000-0000-4000-8000-000000000006';
  x uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('no public quote: no likes', to_jsonb(t.visible_likes(x)), '0');
  perform t.eq('no public quote: no comments', to_jsonb(t.visible_comments(x)), '0');
  perform t.as_user(f);
  perform t.eq('no public quote: cannot like', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (%L, %L)', f, x))), '"42501"');
  perform t.as_user(a);
  perform t.eq('no public quote: owner reads', to_jsonb(t.visible_likes(x) + t.visible_comments(x)), '3');
end $$;
reset role;
update public.entries set is_private = false where id = '00000000-0000-4000-8000-000000000102';
set role authenticated;
do $$
declare x uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01');
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('public again: back', to_jsonb(t.visible_likes(x) + t.visible_comments(x)), '3');
end $$;
reset role;

-- ── 친구를 끊으면: 반응은 남고, 옛 친구는 읽지도 남기지도 못한다 ─
delete from public.friends where user_id = '00000000-0000-4000-8000-000000000001' and friend_id = '00000000-0000-4000-8000-000000000003';
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  c uuid := '00000000-0000-4000-8000-000000000003';
  x uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user(c);
  perform t.eq('former friend reads no likes', to_jsonb(t.visible_likes(x)), '0');
  perform t.eq('former friend reads no comments', to_jsonb(t.visible_comments(x)), '0');
  perform t.eq('former friend cannot comment', to_jsonb(t.state_of(format(
    'insert into public.monthly_excerpt_comments(excerpt_id, user_id, content) values (%L, %L, %L)', x, c, '안녕'))), '"42501"');
  perform t.eq('former friend cannot remove like', to_jsonb(t.deleted(format(
    'delete from public.monthly_excerpt_likes where user_id = %L', c))), '0');
  perform t.as_user(a);
  perform t.eq('owner still sees them', to_jsonb(t.visible_likes(x) + t.visible_comments(x)), '3');
  -- 남은 친구도 그대로 본다.
  perform t.as_user('00000000-0000-4000-8000-000000000006');
  perform t.eq('other friend still sees them', to_jsonb(t.visible_likes(x) + t.visible_comments(x)), '3');
end $$;
reset role;

-- ── 지우기: 반응과 알림이 함께 사라진다 ─────────────────────
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  f uuid := '00000000-0000-4000-8000-000000000006';
  x uuid := t.excerpt_id(a, '2026-03-01');
  fc uuid := '00000000-0000-4000-8000-00000000c020';
begin
  perform t.as_user(f);
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (f, x);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  insert into public.monthly_excerpt_comments(id, excerpt_id, user_id, content) values (fc, x, f, '마지막 댓글');
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment', fc);
  perform t.eq('before delete: like notification', to_jsonb(t.notifs(x, 'excerpt_like')), '1');
  perform t.eq('before delete: comment notifications', to_jsonb(t.notifs(x, 'excerpt_comment')), '2');

  perform t.as_user(a);
  delete from public.monthly_excerpts where id = x;
  perform t.eq('delete: likes gone', to_jsonb(t.real_likes(x)), '0');
  perform t.eq('delete: comments gone', to_jsonb(t.real_comments(x)), '0');
  perform t.eq('delete: like notification gone', to_jsonb(t.notifs(x, 'excerpt_like')), '0');
  perform t.eq('delete: comment notification gone', to_jsonb(t.notifs(x, 'excerpt_comment')), '0');
end $$;
reset role;

-- ── 가리키는 기록이 모두 사라지면 권과 반응, 알림이 함께 사라진다 ─
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  f uuid := '00000000-0000-4000-8000-000000000006';
  x uuid := t.excerpt_id(a, '2026-01-01');
  fc uuid := '00000000-0000-4000-8000-00000000c021';
begin
  perform t.as_user(f);
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (f, x);
  perform public.notify_monthly_excerpt_event(x, 'excerpt_like');
  insert into public.monthly_excerpt_comments(id, excerpt_id, user_id, content) values (fc, x, f, '일월에');
  perform public.notify_monthly_excerpt_event(x, 'excerpt_comment', fc);
  perform t.eq('january notified', to_jsonb(t.notifs(x, 'excerpt_like') + t.notifs(x, 'excerpt_comment')), '2');
end $$;
reset role;
create temp table january as
  select id from public.monthly_excerpts
  where user_id = '00000000-0000-4000-8000-000000000001' and month = '2026-01-01';
delete from public.entries where id = '00000000-0000-4000-8000-000000000104';
set constraints all immediate;
set constraints all deferred;
do $$
declare x uuid := (select id from january);
begin
  if exists (select 1 from public.monthly_excerpts where id = x) then raise exception 'empty excerpt must go'; end if;
  perform t.eq('empty: reactions gone', to_jsonb(t.real_likes(x) + t.real_comments(x)), '0');
  perform t.eq('empty: notifications gone', to_jsonb(t.notifs(x, 'excerpt_like') + t.notifs(x, 'excerpt_comment')), '0');
end $$;
