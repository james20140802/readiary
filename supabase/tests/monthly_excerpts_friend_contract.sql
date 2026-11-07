-- 친구가 읽는 달의 발췌집 계약. 메모리 안의 격리된 DB에서만 실행하고, 실패는 raise exception으로 알린다.
-- 실행기(db.exec)는 파일 전체를 한 트랜잭션으로 보내므로, 트랜잭션 끝에 도는 deferred trigger는
-- `set constraints all immediate`로 그 자리에서 돌려 확인한다.
--
-- 역할: A(…001)는 주인, C(…003)는 수락된 친구(A가 신청), F(…006)는 수락된 친구(F가 신청),
-- D(…004)는 친구가 아니고, E(…005)는 신청만 해 둔 사이다.

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

-- 응답 어디에도 이 글자가 없어야 한다(비공개 기록의 id, 문장, 생각, 책 이름).
create function t.no_trace(p_label text, p_json jsonb) returns void language plpgsql as $$
declare needle text;
begin
  foreach needle in array array[
    '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000103',
    '비공개 문장 피', '비공개 문장 큐', '비공개 생각', '비공개 책', 'isPrivate', 'firstSharedAt'
  ] loop
    if p_json::text like '%' || needle || '%' then
      raise exception '%: leaked % in %', p_label, needle, p_json;
    end if;
  end loop;
end;
$$;

-- 해 목록을 jsonb로 본다.
create function t.years(p_owner uuid) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('year', y.year, 'count', y.excerpt_count) order by y.year desc), '[]'::jsonb)
  from public.get_friend_monthly_excerpt_years(p_owner) y;
$$;

-- 한 권의 항목을 '문장:순서' 목록으로 본다.
create function t.items(p_owner uuid, p_month text) returns text language sql as $$
  select string_agg((i ->> 'quote') || ':' || (i ->> 'position'), ',' order by (i ->> 'position')::int)
  from jsonb_array_elements(public.get_friend_monthly_excerpt(p_owner, p_month) -> 'items') i;
$$;

-- 내 화면의 항목 수.
create function t.my_count(p_month text) returns int language sql as $$
  select jsonb_array_length(public.get_my_monthly_excerpt(p_month) -> 'items');
$$;

create function t.excerpt_id(p_user uuid, p_month date) returns uuid language sql security definer as $$
  select id from public.monthly_excerpts where user_id = p_user and month = p_month;
$$;

-- ── 자료 ────────────────────────────────────────────────────
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000005'),
  ('00000000-0000-4000-8000-000000000006');
insert into public.profiles(id, name, nickname, tag) select id, 'Test', id::text, '0001' from auth.users;
insert into public.books(id, title, author) values
  ('00000000-0000-4000-8000-000000000010', '공개 책', '지은이'),
  ('00000000-0000-4000-8000-000000000020', '비공개 책', '숨은 이');
insert into public.user_books(id, user_id, book_id) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020');
insert into public.friends(user_id, friend_id, status, accepted_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'accepted', now()),
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'accepted', now());
insert into public.friends(user_id, friend_id, status) values
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'pending');

insert into public.entries(id, user_book_id, date, quote, note, is_private, from_page) values
  -- 2026년 3월: 순서는 [비공개 p, 공개 a, 비공개 q, 공개 b]
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000021', '2026-03-01', '비공개 문장 피', '비공개 생각', true, null),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000011', '2026-03-02', '공개 문장 에이', '공개 생각', false, 7),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000021', '2026-03-03', '비공개 문장 큐', null, true, null),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000011', '2026-03-04', '공개 문장 비', null, false, null),
  -- 2026년 2월: 나만 보기로 엮는다
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000011', '2026-02-02', '이월 문장', null, false, null),
  -- 2026년 1월: 공개로 엮고 이 기록만 나중에 비공개로 돌린다
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000011', '2026-01-02', '일월 문장', null, false, null),
  -- 2025년 12월: 공개로 엮는다(다른 해)
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000011', '2025-12-02', '십이월 문장', null, false, null);

-- ── 권한: 호출할 수 있는 사람과 정의 ────────────────────────
do $$
declare
  fn text;
  v_bad text;
begin
  -- 공개 RPC는 authenticated만 부른다. Supabase의 기본 함수 권한(anon에 직접 부여)을 stubs가 재현하므로
  -- 마이그레이션의 revoke가 빠지면 아래 proacl 검사에서 잡힌다.
  foreach fn in array array[
    'public.can_view_monthly_excerpt(uuid)',
    'public.get_friend_monthly_excerpt(uuid,text)',
    'public.get_friend_monthly_excerpt_years(uuid)',
    'public.get_friend_monthly_excerpt_year(uuid,integer)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;

  -- 내부 함수는 anon도 authenticated도 부르지 못한다. 공개 RPC가 정의자 권한으로만 부른다.
  fn := 'public.monthly_excerpt_visible_items(uuid)';
  if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
  if has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must not execute %', fn; end if;

  -- proacl: PUBLIC(grantee 0)과 anon의 항목이 없어야 한다. 내부 함수는 authenticated의 항목도 없어야 한다.
  select string_agg(p.proname || '/' || a.grantee::regrole::text, ',') into v_bad
  from pg_proc p
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('can_view_monthly_excerpt', 'get_friend_monthly_excerpt',
                      'get_friend_monthly_excerpt_years', 'get_friend_monthly_excerpt_year',
                      'monthly_excerpt_visible_items')
    and (a.grantee = 0 or a.grantee = 'anon'::regrole
         or (p.proname = 'monthly_excerpt_visible_items' and a.grantee = 'authenticated'::regrole));
  if v_bad is not null then raise exception 'proacl must not grant: %', v_bad; end if;

  -- 공개 RPC는 정의자 권한이고, 내부 함수는 호출자 권한이다. 모두 search_path = ''로 고정한다.
  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('can_view_monthly_excerpt', 'get_friend_monthly_excerpt',
                      'get_friend_monthly_excerpt_years', 'get_friend_monthly_excerpt_year')
    and not p.prosecdef;
  if v_bad is not null then raise exception 'must be security definer: %', v_bad; end if;

  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'monthly_excerpt_visible_items' and p.prosecdef;
  if v_bad is not null then raise exception 'internal helper must not be security definer: %', v_bad; end if;

  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('can_view_monthly_excerpt', 'get_friend_monthly_excerpt',
                      'get_friend_monthly_excerpt_years', 'get_friend_monthly_excerpt_year',
                      'monthly_excerpt_visible_items')
    and not coalesce(p.proconfig @> array['search_path=""'], false);
  if v_bad is not null then raise exception 'search_path must be empty: %', v_bad; end if;

  -- 보는 사람을 인자로 받지 않는다. 신원은 auth.uid()뿐이다.
  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('can_view_monthly_excerpt', 'get_friend_monthly_excerpt',
                      'get_friend_monthly_excerpt_years', 'get_friend_monthly_excerpt_year')
    and exists (select 1 from unnest(p.proargnames) a where a ilike '%viewer%' or a ilike '%user%');
  if v_bad is not null then raise exception 'must not accept a caller-supplied viewer: %', v_bad; end if;
end $$;

-- ── A가 엮는다 ──────────────────────────────────────────────
set role authenticated;
select t.as_user('00000000-0000-4000-8000-000000000001');
select public.save_monthly_excerpt('2026-03', array[
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000104'
]::uuid[], true);
select public.save_monthly_excerpt('2026-02', array['00000000-0000-4000-8000-000000000105']::uuid[], false);
select public.save_monthly_excerpt('2026-01', array['00000000-0000-4000-8000-000000000106']::uuid[], true);
select public.save_monthly_excerpt('2025-12', array['00000000-0000-4000-8000-000000000107']::uuid[], true);
set constraints all immediate;
set constraints all deferred;
reset role;

-- A가 1월 기록을 비공개로 돌린다: 공유 중이지만 공개 문장이 없는 권이 된다.
update public.entries set is_private = true where id = '00000000-0000-4000-8000-000000000106';

-- ── 친구 C: 공개 문장만, 번호는 다시 매긴다 ────────────────
set role authenticated;
select t.as_user('00000000-0000-4000-8000-000000000003');
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  v jsonb := public.get_friend_monthly_excerpt(a, '2026-03');
  v_first jsonb;
  v_year jsonb;
begin
  perform t.eq('top keys', (select jsonb_agg(k order by k) from jsonb_object_keys(v) k),
    '["id","isShared","items","month"]');
  perform t.eq('month', v -> 'month', '"2026-03"');
  perform t.eq('friend sees shared flag', v -> 'isShared', 'true');
  perform t.eq('friend sees a, b only', to_jsonb(t.items(a, '2026-03')), '"공개 문장 에이:1,공개 문장 비:2"');
  perform t.no_trace('friend excerpt', v);

  v_first := v -> 'items' -> 0;
  perform t.eq('item keys', (select jsonb_agg(k order by k) from jsonb_object_keys(v_first) k),
    '["book","date","entryId","fromPage","note","position","quote","toPage"]');
  perform t.eq('public note comes with the quote', v_first -> 'note', '"공개 생각"');
  perform t.eq('book', v_first -> 'book', jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000010', 'title', '공개 책', 'author', '지은이'));

  -- 해 목록: 나만 보기(2월)와 공개 문장 없는 권(1월)은 세지 않는다.
  perform t.eq('friend years', t.years(a), '[{"year":2026,"count":1},{"year":2025,"count":1}]');

  -- 한 해의 달: 보이는 수와 표지만. 표지는 a다(순서상 먼저인 p가 아니다).
  v_year := public.get_friend_monthly_excerpt_year(a, 2026);
  perform t.no_trace('friend year', v_year);
  perform t.eq('only the visible month', (select jsonb_agg(r ->> 'month') from jsonb_array_elements(v_year) r), '["2026-03"]');
  perform t.eq('year row keys', (select jsonb_agg(k order by k) from jsonb_object_keys(v_year -> 0) k),
    '["coverQuote","excerptId","month","quoteCount"]');
  perform t.eq('quote count is what the friend sees', v_year -> 0 -> 'quoteCount', '2');
  perform t.eq('cover is the first visible quote', v_year -> 0 -> 'coverQuote', '"공개 문장 에이"');
  perform t.eq('excerpt id', v_year -> 0 -> 'excerptId', v -> 'id');

  perform t.eq('other year', public.get_friend_monthly_excerpt_year(a, 2025) -> 0 -> 'month', '"2025-12"');

  -- 볼 수 없는 권: 나만 보기, 공개 문장 없음, 없는 달
  perform t.eq('private excerpt', public.get_friend_monthly_excerpt(a, '2026-02'), null);
  perform t.eq('no public quotes', public.get_friend_monthly_excerpt(a, '2026-01'), null);
  perform t.eq('nonexistent month', public.get_friend_monthly_excerpt(a, '2024-05'), null);

  -- can_view
  perform t.eq('can view shared', to_jsonb(public.can_view_monthly_excerpt((v ->> 'id')::uuid)), 'true');
  perform t.eq('cannot view private excerpt',
    to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-02-01'))), 'false');
  perform t.eq('cannot view without public quotes',
    to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-01-01'))), 'false');

  -- 잘못된 입력은 예외 없이 빈 결과다. 없는 사람도 같다.
  perform t.eq('invalid month', public.get_friend_monthly_excerpt(a, '2026-13'), null);
  perform t.eq('garbage month', public.get_friend_monthly_excerpt(a, $s$'; drop table x; --$s$), null);
  perform t.eq('null month', public.get_friend_monthly_excerpt(a, null), null);
  perform t.eq('year 0', public.get_friend_monthly_excerpt_year(a, 0), '[]');
  perform t.eq('huge year', public.get_friend_monthly_excerpt_year(a, 2000000000), '[]');
  perform t.eq('null year', public.get_friend_monthly_excerpt_year(a, null), '[]');
  perform t.eq('null can_view', to_jsonb(public.can_view_monthly_excerpt(null)), 'false');
  perform t.eq('unknown can_view',
    to_jsonb(public.can_view_monthly_excerpt('00000000-0000-4000-8000-00000000ffff')), 'false');
  perform t.eq('null owner', public.get_friend_monthly_excerpt(null, '2026-03'), null);
  perform t.eq('null owner years', t.years(null), '[]');
end $$;

-- 테이블을 직접 읽으면 0행이다. 항목 표로 비공개 기록의 id를 알아낼 수 없다.
do $$
declare n int;
begin
  select count(*) into n from public.monthly_excerpts;
  if n <> 0 then raise exception 'C must not read monthly_excerpts directly: %', n; end if;
  select count(*) into n from public.monthly_excerpt_items;
  if n <> 0 then raise exception 'C must not read monthly_excerpt_items directly: %', n; end if;
  select count(*) into n from public.entries where is_private;
  if n <> 0 then raise exception 'C must not read private entries directly: %', n; end if;
end $$;

-- 내부 함수를 직접 부르지 못한다.
do $$
begin
  begin
    perform public.monthly_excerpt_visible_items('00000000-0000-4000-8000-00000000ffff');
    raise exception 'internal helper must be denied to authenticated';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 반대 방향으로 친구가 된 F도 같은 결과를 본다.
select t.as_user('00000000-0000-4000-8000-000000000006');
do $$
begin
  perform t.eq('friend in the other direction',
    to_jsonb(t.items('00000000-0000-4000-8000-000000000001', '2026-03')), '"공개 문장 에이:1,공개 문장 비:2"');
end $$;

-- ── 친구가 아닌 D, 신청만 한 E: 모든 경우에 같은 빈 결과 ────
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  v_user uuid;
  v_id uuid := t.excerpt_id(a, '2026-03-01');
begin
  foreach v_user in array array['00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005']::uuid[] loop
    perform t.as_user(v_user);
    -- 있는 달, 없는 달, 잘못된 달, 없는 사람을 구별할 수 없어야 한다.
    perform t.eq('stranger, shared', public.get_friend_monthly_excerpt(a, '2026-03'), null);
    perform t.eq('stranger, private', public.get_friend_monthly_excerpt(a, '2026-02'), null);
    perform t.eq('stranger, nonexistent', public.get_friend_monthly_excerpt(a, '2024-05'), null);
    perform t.eq('stranger, invalid month', public.get_friend_monthly_excerpt(a, '2026-13'), null);
    perform t.eq('stranger, no such owner',
      public.get_friend_monthly_excerpt('00000000-0000-4000-8000-00000000ffff', '2026-03'), null);
    perform t.eq('stranger years', t.years(a), '[]');
    perform t.eq('stranger years, no such owner', t.years('00000000-0000-4000-8000-00000000ffff'), '[]');
    perform t.eq('stranger year', public.get_friend_monthly_excerpt_year(a, 2026), '[]');
    perform t.eq('stranger year, invalid', public.get_friend_monthly_excerpt_year(a, 0), '[]');
    perform t.eq('stranger year, no such owner',
      public.get_friend_monthly_excerpt_year('00000000-0000-4000-8000-00000000ffff', 2026), '[]');
    perform t.eq('stranger can_view', to_jsonb(public.can_view_monthly_excerpt(v_id)), 'false');
    perform t.eq('stranger can_view unknown',
      to_jsonb(public.can_view_monthly_excerpt('00000000-0000-4000-8000-00000000ffff')), 'false');
  end loop;
end $$;
reset role;

-- ── anon: 부를 수 없다 ──────────────────────────────────────
do $$
declare
  stmt text;
begin
  perform t.as_anon();
  set local role anon;
  foreach stmt in array array[
    $q$select public.can_view_monthly_excerpt('00000000-0000-4000-8000-000000000001')$q$,
    $q$select public.get_friend_monthly_excerpt('00000000-0000-4000-8000-000000000001', '2026-03')$q$,
    $q$select * from public.get_friend_monthly_excerpt_years('00000000-0000-4000-8000-000000000001')$q$,
    $q$select public.get_friend_monthly_excerpt_year('00000000-0000-4000-8000-000000000001', 2026)$q$,
    $q$select * from public.monthly_excerpt_visible_items('00000000-0000-4000-8000-000000000001')$q$
  ] loop
    begin
      execute stmt;
      raise exception 'anon must be denied: %', stmt;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
reset role;

-- 권한이 뚫려도 값은 비어 있어야 한다: 신원 없이 부른 결과를 정의자 권한 그대로 확인한다.
select t.as_anon();
do $$
declare a uuid := '00000000-0000-4000-8000-000000000001';
begin
  perform t.eq('no identity', public.get_friend_monthly_excerpt(a, '2026-03'), null);
  perform t.eq('no identity years', t.years(a), '[]');
  perform t.eq('no identity year', public.get_friend_monthly_excerpt_year(a, 2026), '[]');
  perform t.eq('no identity can_view', to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-03-01'))), 'false');
end $$;

-- ── 주인 A ──────────────────────────────────────────────────
set role authenticated;
select t.as_user('00000000-0000-4000-8000-000000000001');
do $$
declare a uuid := '00000000-0000-4000-8000-000000000001';
begin
  -- 주인은 나만 보기와 공개 문장 없는 권도 can_view다.
  perform t.eq('owner can view shared', to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-03-01'))), 'true');
  perform t.eq('owner can view private', to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-02-01'))), 'true');
  perform t.eq('owner can view no-public', to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-01-01'))), 'true');
  -- 친구용 RPC는 친구에게만 답한다. 내 화면은 get_my_monthly_excerpt를 쓴다.
  perform t.eq('friend RPC is not for the owner', public.get_friend_monthly_excerpt(a, '2026-03'), null);
  perform t.eq('owner sees everything', to_jsonb(t.my_count('2026-03')), '4');
end $$;

-- ── a, b를 비공개로: C에게 사라지고 A에게는 그대로, 되돌리면 복귀 ──
update public.entries set is_private = true
where id in ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000104');
do $$
declare a uuid := '00000000-0000-4000-8000-000000000001';
begin
  perform t.eq('A still sees all after going private', to_jsonb(t.my_count('2026-03')), '4');
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('C sees nothing', public.get_friend_monthly_excerpt(a, '2026-03'), null);
  perform t.eq('C years drop it', t.years(a), '[{"year":2025,"count":1}]');
  perform t.eq('C year empty', public.get_friend_monthly_excerpt_year(a, 2026), '[]');
  perform t.eq('C can_view false', to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-03-01'))), 'false');
  perform t.as_user(a);
end $$;
update public.entries set is_private = false
where id in ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000104');
do $$
declare a uuid := '00000000-0000-4000-8000-000000000001';
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('C sees it again', to_jsonb(t.items(a, '2026-03')), '"공개 문장 에이:1,공개 문장 비:2"');
  perform t.as_user(a);
end $$;

-- ── 하나만 비공개로: 번호가 다시 메워지고 표지가 옮겨 간다 ────
update public.entries set is_private = true where id = '00000000-0000-4000-8000-000000000102';
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  v_year jsonb;
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('renumbered', to_jsonb(t.items(a, '2026-03')), '"공개 문장 비:1"');
  v_year := public.get_friend_monthly_excerpt_year(a, 2026);
  perform t.eq('cover moves', v_year -> 0 -> 'coverQuote', '"공개 문장 비"');
  perform t.eq('count follows', v_year -> 0 -> 'quoteCount', '1');
  perform t.as_user(a);
end $$;
update public.entries set is_private = false where id = '00000000-0000-4000-8000-000000000102';

-- ── 나만 보기로 돌리면 사라지고, 다시 공개하면 복귀 ─────────
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  v_id uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform public.set_monthly_excerpt_shared(v_id, false);
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('private again', public.get_friend_monthly_excerpt(a, '2026-03'), null);
  perform t.eq('private again, can_view', to_jsonb(public.can_view_monthly_excerpt(v_id)), 'false');
  perform t.as_user(a);
  perform public.set_monthly_excerpt_shared(v_id, true);
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('shared again', to_jsonb(t.items(a, '2026-03')), '"공개 문장 에이:1,공개 문장 비:2"');
  perform t.as_user(a);
end $$;
reset role;

-- ── 기록을 지우면 바로 빠진다 ───────────────────────────────
delete from public.entries where id = '00000000-0000-4000-8000-000000000102';
set constraints all immediate;
set constraints all deferred;
do $$
declare a uuid := '00000000-0000-4000-8000-000000000001';
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('deleted entry gone', to_jsonb(t.items(a, '2026-03')), '"공개 문장 비:1"');
end $$;

-- ── 친구를 끊으면 볼 수 없다 ────────────────────────────────
delete from public.friends where user_id = '00000000-0000-4000-8000-000000000001' and friend_id = '00000000-0000-4000-8000-000000000003';
set role authenticated;
do $$
declare a uuid := '00000000-0000-4000-8000-000000000001';
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('unfriended', public.get_friend_monthly_excerpt(a, '2026-03'), null);
  perform t.eq('unfriended years', t.years(a), '[]');
  perform t.eq('unfriended year', public.get_friend_monthly_excerpt_year(a, 2026), '[]');
  perform t.eq('unfriended can_view', to_jsonb(public.can_view_monthly_excerpt(t.excerpt_id(a, '2026-03-01'))), 'false');
  perform t.as_user(a);
  perform t.eq('A keeps it after unfriending', to_jsonb(t.my_count('2026-03')), '3');
end $$;
reset role;
