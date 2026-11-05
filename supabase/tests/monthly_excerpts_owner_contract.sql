-- 메모리 안의 격리된 DB에서만 실행한다. 실패는 raise exception으로 알린다.
-- 실행기(db.exec)는 파일 전체를 한 트랜잭션으로 보내므로, 트랜잭션 끝에 도는 deferred trigger는
-- `set constraints all immediate`로 그 자리에서 돌려 확인한다.

-- ── 테스트 도구 ──────────────────────────────────────────────
create schema t;
grant usage on schema t to authenticated;

create function t.as_user(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, false);
$$;

create function t.eq(p_label text, p_got jsonb, p_want jsonb) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: got % want %', p_label, p_got, p_want;
  end if;
end;
$$;

-- 오늘(KST)을 고정한다. 테스트 전용이라 정의자 권한으로 재정의한다.
create function t.set_today(p_today date) returns void language plpgsql security definer as $$
begin
  execute format(
    'create or replace function public.monthly_excerpt_kst_today() returns date
     language sql stable set search_path = '''' as %L',
    format('select %L::date', p_today)
  );
end;
$$;

-- 저장을 시도하고 예외의 메시지와 DETAIL을 돌려준다. 예외가 없으면 null이다.
create function t.save_err(p_month text, p_ids uuid[], p_shared boolean) returns jsonb language plpgsql as $$
declare v_detail text;
begin
  perform public.save_monthly_excerpt(p_month, p_ids, p_shared);
  return null;
exception when raise_exception then
  get stacked diagnostics v_detail = pg_exception_detail;
  return jsonb_build_object('msg', sqlerrm, 'detail', nullif(v_detail, '')::jsonb);
end;
$$;

create function t.shared_err(p_id uuid, p_shared boolean) returns text language plpgsql as $$
begin
  perform public.set_monthly_excerpt_shared(p_id, p_shared);
  return null;
exception when raise_exception then
  return sqlerrm;
end;
$$;

-- 내 발췌집 항목을 'entryId 끝 세 자리:position' 목록으로 본다.
create function t.items(p_month text) returns text language sql as $$
  select string_agg(right(i ->> 'entryId', 3) || ':' || (i ->> 'position'), ',' order by (i ->> 'position')::int)
  from jsonb_array_elements(public.get_my_monthly_excerpt(p_month) -> 'items') i;
$$;

create function t.excerpt_id(p_user uuid, p_month date) returns uuid language sql security definer as $$
  select id from public.monthly_excerpts where user_id = p_user and month = p_month;
$$;

create function t.excerpt_rows(p_user uuid) returns int language sql security definer as $$
  select count(*)::int from public.monthly_excerpts where user_id = p_user;
$$;

-- ── 자료 ────────────────────────────────────────────────────
-- A = …001, B = …002. A는 책 2권(…011, …021), B는 책 1권(…012). A와 B는 친구다.
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
insert into public.profiles(id, name, nickname, tag) select id, 'Test', id::text, '0001' from auth.users;
insert into public.books(id, title, author) values
  ('00000000-0000-4000-8000-000000000010', '아무튼, 메모', '정혜윤'),
  ('00000000-0000-4000-8000-000000000020', '두 번째 책', null);
insert into public.user_books(id, user_id, book_id) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010');
insert into public.friends(user_id, friend_id, status, accepted_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'accepted', now());

insert into public.entries(id, user_book_id, date, quote, note, is_private, from_page, to_page, created_at) values
  -- 3월 문장 3개(공개 2, 비공개 1). 같은 날은 created_at 순서라 후보는 102, 103, 101이다.
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000011', '2026-03-20', '문장 일', '생각 일', false, 10, 12, '2026-03-20 10:00+09'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000021', '2026-03-10', '문장 이', '생각 이', false, null, null, '2026-03-10 10:00+09'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000011', '2026-03-20', '문장 삼', '생각 삼', true, null, null, '2026-03-20 09:00+09'),
  -- 3월의 생각만 있는 기록, 공백뿐인 문장
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000011', '2026-03-05', null, '생각만', false, null, null, '2026-03-05 10:00+09'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000011', '2026-03-06', E'  \n ', '공백 문장', false, null, null, '2026-03-06 10:00+09'),
  -- 4월 문장, 2월의 생각만 있는 기록
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000011', '2026-04-03', '사월 문장', null, false, null, null, '2026-04-03 10:00+09'),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000011', '2026-02-14', null, '이월 생각', false, null, null, '2026-02-14 10:00+09'),
  -- B의 3월 문장(친구 공개)
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000012', '2026-03-15', 'B의 문장', null, false, null, null, '2026-03-15 10:00+09');
-- 2025년 6월의 문장 55개: limit 상한과 지난해 집계를 본다.
insert into public.entries(user_book_id, date, quote, created_at)
select '00000000-0000-4000-8000-000000000021', '2025-06-10', '유월 ' || n, '2025-06-10'::timestamptz + n * interval '1 minute'
from generate_series(1, 55) n;

-- ── 권한 ────────────────────────────────────────────────────
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.save_monthly_excerpt(text,uuid[],boolean)',
    'public.set_monthly_excerpt_shared(uuid,boolean)',
    'public.get_my_monthly_excerpt(text)',
    'public.get_monthly_excerpt_candidates(text,uuid,integer,integer)',
    'public.get_monthly_excerpt_month_books(text)',
    'public.get_my_monthly_excerpt_years()',
    'public.get_my_monthly_excerpt_year(integer)',
    'public.get_monthly_excerpt_prompt(date)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;

  -- 내부 함수도 anon은 못 부르고, 트리거 함수는 아무도 직접 받지 않는다.
  foreach fn in array array['public.monthly_excerpt_kst_today()', 'public.monthly_excerpt_month_start(text)',
                            'public.monthly_excerpt_drop_if_empty()', 'public.monthly_excerpt_sync_entry()'] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
  end loop;
  foreach fn in array array['public.monthly_excerpt_drop_if_empty()', 'public.monthly_excerpt_sync_entry()'] loop
    if has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must not execute %', fn; end if;
  end loop;

  -- 새 함수는 모두 search_path = ''로 고정한다.
  select string_agg(p.proname, ',') into fn from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname like '%monthly_excerpt%'
    and not coalesce(p.proconfig, '{}') @> array['search_path=""'];
  if fn is not null then raise exception 'search_path not pinned: %', fn; end if;

  if has_table_privilege('anon', 'public.monthly_excerpts', 'select')
    or has_table_privilege('anon', 'public.monthly_excerpt_items', 'select') then
    raise exception 'anon must not read monthly excerpt tables';
  end if;
end $$;

-- 세션과 무관하게 KST로 오늘을 잡는다(재정의 전 진짜 함수). 파고파고(UTC-11)면 날짜가 대개 어긋난다.
set local time zone 'Pacific/Pago_Pago';
select t.eq('kst today ignores session time zone',
  to_jsonb(public.monthly_excerpt_kst_today()), to_jsonb((now() at time zone 'Asia/Seoul')::date));
set local time zone 'UTC';

-- ── 로그인 없이 부르면 막힌다 ───────────────────────────────
set role authenticated;
select set_config('request.jwt.claims', '', false);
do $$
declare stmt text;
begin
  foreach stmt in array array[
    $q$select public.save_monthly_excerpt('2026-03', array[gen_random_uuid()], false)$q$,
    $q$select public.set_monthly_excerpt_shared(gen_random_uuid(), false)$q$,
    $q$select public.get_my_monthly_excerpt('2026-03')$q$,
    $q$select public.get_monthly_excerpt_candidates('2026-03')$q$,
    $q$select * from public.get_monthly_excerpt_month_books('2026-03')$q$,
    $q$select * from public.get_my_monthly_excerpt_years()$q$,
    $q$select public.get_my_monthly_excerpt_year(2026)$q$,
    $q$select public.get_monthly_excerpt_prompt('2026-04-01')$q$
  ] loop
    begin
      execute stmt;
      raise exception 'must require login: %', stmt;
    exception when raise_exception then
      if sqlerrm <> 'Authentication required' then raise; end if;
    end;
  end loop;
end $$;

-- ── 엮기 전의 읽기 ───────────────────────────────────────────
select t.as_user('00000000-0000-4000-8000-000000000001');
select t.set_today('2026-04-01');
do $$ begin
  if public.get_my_monthly_excerpt('2026-03') is not null then raise exception 'no excerpt yet must be null'; end if;
  perform t.eq('prompt before making', public.get_monthly_excerpt_prompt('2026-04-03'),
    '{"month":"2026-03","quoteCount":3,"bookCount":2}');
  perform t.eq('prompt for a month without quotes', public.get_monthly_excerpt_prompt('2026-03-01'), null);
end $$;

-- 후보: 비공개 포함, 생각만·공백 문장 제외, 날짜·created_at 오름차순, 내 기록만
do $$
declare v jsonb := public.get_monthly_excerpt_candidates('2026-03');
begin
  perform t.eq('candidates order', (select jsonb_agg(right(c ->> 'entryId', 3)) from jsonb_array_elements(v) c),
    '["102","103","101"]');
  perform t.eq('candidate shape', v -> 2, jsonb_build_object(
    'entryId', '00000000-0000-4000-8000-000000000101', 'date', '2026-03-20', 'quote', '문장 일', 'hasNote', true,
    'isPrivate', false, 'fromPage', 10, 'toPage', 12,
    'userBookId', '00000000-0000-4000-8000-000000000011', 'bookTitle', '아무튼, 메모'));
  perform t.eq('private candidate is flagged', v -> 1 -> 'isPrivate', 'true');

  perform t.eq('filter by book',
    (select jsonb_agg(right(c ->> 'entryId', 3)) from jsonb_array_elements(
      public.get_monthly_excerpt_candidates('2026-03', '00000000-0000-4000-8000-000000000011')) c),
    '["103","101"]');
  perform t.eq('second page',
    (select jsonb_agg(right(c ->> 'entryId', 3)) from jsonb_array_elements(
      public.get_monthly_excerpt_candidates('2026-03', null, 1, 2)) c),
    '["101"]');
  perform t.eq('default page size', to_jsonb(jsonb_array_length(public.get_monthly_excerpt_candidates('2025-06'))), '30');
  perform t.eq('limit is capped at 50', to_jsonb(jsonb_array_length(public.get_monthly_excerpt_candidates('2025-06', null, 0, 999))), '50');
  perform t.eq('empty month is an empty array', public.get_monthly_excerpt_candidates('2026-01'), '[]');
end $$;

do $$ begin
  perform t.eq('month books',
    (select jsonb_agg(jsonb_build_array(b.user_book_id, b.title, b.quote_count))
     from public.get_monthly_excerpt_month_books('2026-03') b),
    '[["00000000-0000-4000-8000-000000000011","아무튼, 메모",2],["00000000-0000-4000-8000-000000000021","두 번째 책",1]]');
end $$;

-- 친구인 B도 A의 후보·책·연도를 받지 못한다(entries RLS로는 친구 공개 기록이 보이는 관계다).
select t.as_user('00000000-0000-4000-8000-000000000002');
do $$ begin
  perform t.eq('friend sees own candidates only',
    (select jsonb_agg(right(c ->> 'entryId', 3)) from jsonb_array_elements(public.get_monthly_excerpt_candidates('2026-03')) c),
    '["201"]');
  perform t.eq('friend sees own month books only',
    (select jsonb_agg(b.user_book_id) from public.get_monthly_excerpt_month_books('2026-03') b),
    '["00000000-0000-4000-8000-000000000012"]');
  perform t.eq('friend years',
    (select jsonb_agg(y.year) from public.get_my_monthly_excerpt_years() y), '[2026]');
  perform t.eq('friend prompt counts own quotes', public.get_monthly_excerpt_prompt('2026-04-03'),
    '{"month":"2026-03","quoteCount":1,"bookCount":1}');
end $$;
select t.as_user('00000000-0000-4000-8000-000000000001');

-- ── 끝난 달 판정 ─────────────────────────────────────────────
select t.set_today('2026-03-31');
do $$ begin
  perform t.eq('march 31 KST is not finished',
    t.save_err('2026-03', array['00000000-0000-4000-8000-000000000101']::uuid[], false),
    '{"msg":"month_not_finished","detail":null}');
end $$;
select t.set_today('2026-04-01');
do $$ begin
  perform t.eq('future month is not finished',
    t.save_err('2026-05', array['00000000-0000-4000-8000-000000000101']::uuid[], false),
    '{"msg":"month_not_finished","detail":null}');
  perform t.eq('malformed month',
    t.save_err('2026-13', array['00000000-0000-4000-8000-000000000101']::uuid[], false),
    '{"msg":"invalid_month","detail":null}');
end $$;

-- ── 저장: 입력 순서, position 1부터 ──────────────────────────
do $$
declare v_id uuid; v jsonb;
begin
  v_id := public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102'
  ]::uuid[], false);
  v := public.get_my_monthly_excerpt('2026-03');
  perform t.eq('saved items keep input order', to_jsonb(t.items('2026-03')), '"103:1,101:2,102:3"');
  perform t.eq('excerpt envelope', v - 'items', jsonb_build_object(
    'id', v_id, 'month', '2026-03', 'isShared', false, 'firstSharedAt', null));
  perform t.eq('item shape', v -> 'items' -> 1, jsonb_build_object(
    'position', 2, 'entryId', '00000000-0000-4000-8000-000000000101', 'date', '2026-03-20',
    'quote', '문장 일', 'note', '생각 일', 'isPrivate', false, 'fromPage', 10, 'toPage', 12,
    'book', jsonb_build_object('id', '00000000-0000-4000-8000-000000000010', 'title', '아무튼, 메모', 'author', '정혜윤')));
  perform t.eq('private item is flagged for the owner', v -> 'items' -> 0 -> 'isPrivate', 'true');
  perform t.eq('prompt is gone once made', public.get_monthly_excerpt_prompt('2026-04-03'), null);
end $$;

-- 같은 달 재저장: 행 1개, id 유지, 재저장 도중 빈 발췌집 정리가 지우지 않는다.
do $$
declare v_before uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01'); v_after uuid;
begin
  v_after := public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101'
  ]::uuid[], false);
  if v_after is distinct from v_before then raise exception 'resave must keep id: % -> %', v_before, v_after; end if;
end $$;
set constraints all immediate;
set constraints all deferred;
do $$ begin
  perform t.eq('resave keeps one row', to_jsonb(t.excerpt_rows('00000000-0000-4000-8000-000000000001')), '1');
  perform t.eq('resave replaces items', to_jsonb(t.items('2026-03')), '"102:1,101:2"');
end $$;

-- ── stale_entries: 그 id만, 저장은 바뀌지 않는다 ─────────────
do $$
declare
  ok constant uuid := '00000000-0000-4000-8000-000000000103';
  bad uuid;
begin
  foreach bad in array array[
    '00000000-0000-4000-8000-000000000201', -- 다른 사람 기록
    '00000000-0000-4000-8000-000000000105', -- 다른 달 기록
    '00000000-0000-4000-8000-000000000104', -- 생각만 있는 기록
    '00000000-0000-4000-8000-000000000107', -- 공백뿐인 문장
    '00000000-0000-4000-8000-000000000999'  -- 없는 id
  ]::uuid[] loop
    perform t.eq('stale ' || bad, t.save_err('2026-03', array[ok, bad], false),
      jsonb_build_object('msg', 'stale_entries', 'detail', jsonb_build_array(bad)));
  end loop;
  perform t.eq('duplicate id is stale',
    t.save_err('2026-03', array[
      ok, '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101'
    ]::uuid[], false),
    '{"msg":"stale_entries","detail":["00000000-0000-4000-8000-000000000101"]}');
  perform t.eq('failed save changes nothing', to_jsonb(t.items('2026-03')), '"102:1,101:2"');

  perform t.eq('empty array', t.save_err('2026-03', '{}', false), '{"msg":"no_entries","detail":null}');
  perform t.eq('null array', t.save_err('2026-03', null, false), '{"msg":"no_entries","detail":null}');
  perform t.eq('private only cannot be shared', t.save_err('2026-03', array[ok], true),
    '{"msg":"no_public_quotes","detail":null}');
end $$;

-- ── 공개: first_shared_at은 처음 공개 때만 ───────────────────
do $$
declare v_id uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01');
begin
  if (public.get_my_monthly_excerpt('2026-03') ->> 'firstSharedAt') is not null then
    raise exception 'private save must not stamp first_shared_at';
  end if;
  perform public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103'
  ]::uuid[], true);
  if (public.get_my_monthly_excerpt('2026-03') ->> 'firstSharedAt') is null then
    raise exception 'public save must stamp first_shared_at';
  end if;
  perform t.eq('isShared after public save', public.get_my_monthly_excerpt('2026-03') -> 'isShared', 'true');
end $$;

-- 트랜잭션 안의 now()는 그대로라 값을 옛날로 돌려 두고, 다시 찍히지 않는지 본다.
reset role;
update public.monthly_excerpts set first_shared_at = '2000-01-01T00:00:00Z' where month = '2026-03-01';
set role authenticated;
do $$
declare
  v_id uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01');
  v_old constant timestamptz := '2000-01-01T00:00:00Z';
  v jsonb;
begin
  perform public.set_monthly_excerpt_shared(v_id, false);
  v := public.get_my_monthly_excerpt('2026-03');
  perform t.eq('off', v -> 'isShared', 'false');
  if (v ->> 'firstSharedAt')::timestamptz <> v_old then raise exception 'turning off must keep first_shared_at'; end if;
  perform public.set_monthly_excerpt_shared(v_id, true);
  v := public.get_my_monthly_excerpt('2026-03');
  perform t.eq('on again', v -> 'isShared', 'true');
  if (v ->> 'firstSharedAt')::timestamptz <> v_old then raise exception 'turning on again must keep first_shared_at'; end if;
  -- 재저장으로 공개를 유지해도 그대로다.
  perform public.save_monthly_excerpt('2026-03', array['00000000-0000-4000-8000-000000000102']::uuid[], true);
  if (public.get_my_monthly_excerpt('2026-03') ->> 'firstSharedAt')::timestamptz <> v_old then
    raise exception 'public resave must keep first_shared_at';
  end if;

  perform t.eq('not my excerpt id', to_jsonb(t.shared_err('00000000-0000-4000-8000-000000000999', true)), '"not_found"');

  -- 비공개만 남은 발췌집은 공개로 돌릴 수 없다.
  perform public.save_monthly_excerpt('2026-03', array['00000000-0000-4000-8000-000000000103']::uuid[], false);
  perform t.eq('private only cannot be turned on', to_jsonb(t.shared_err(v_id, true)), '"no_public_quotes"');
  perform t.eq('failed turn-on keeps private', public.get_my_monthly_excerpt('2026-03') -> 'isShared', 'false');
end $$;

select t.as_user('00000000-0000-4000-8000-000000000002');
do $$ begin
  perform t.eq('someone else cannot share my excerpt',
    to_jsonb(t.shared_err(t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01'), false)), '"not_found"');
end $$;
select t.as_user('00000000-0000-4000-8000-000000000001');

-- ── 기록을 고치면 항목이 따라간다 ────────────────────────────
do $$ begin
  perform public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103'
  ]::uuid[], false);

  -- 같은 달 안에서 날짜를 옮기거나 문장을 고치면 그대로다.
  update public.entries set date = '2026-03-21', quote = '문장 일 고침' where id = '00000000-0000-4000-8000-000000000101';
  perform t.eq('same-month edit keeps item', to_jsonb(t.items('2026-03')), '"101:1,102:2,103:3"');
  update public.entries set date = '2026-03-20', quote = '문장 일' where id = '00000000-0000-4000-8000-000000000101';

  -- 가운데 항목을 다른 달로 옮기면 빠지고, 번호의 빈틈은 읽을 때 메운다.
  update public.entries set date = '2026-04-02' where id = '00000000-0000-4000-8000-000000000102';
  perform t.eq('moved to another month', to_jsonb(t.items('2026-03')), '"101:1,103:2"');
  update public.entries set date = '2026-03-10' where id = '00000000-0000-4000-8000-000000000102';
  perform t.eq('moving back does not restore it', to_jsonb(t.items('2026-03')), '"101:1,103:2"');

  -- 문장을 지워 생각만 남기면 빠진다.
  update public.entries set quote = null where id = '00000000-0000-4000-8000-000000000101';
  perform t.eq('quote removed', to_jsonb(t.items('2026-03')), '"103:1"');
  update public.entries set quote = '문장 일' where id = '00000000-0000-4000-8000-000000000101';

  -- 공백뿐인 문장도 빈 문장이다.
  perform public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102'
  ]::uuid[], false);
  update public.entries set quote = '   ' where id = '00000000-0000-4000-8000-000000000102';
  perform t.eq('blank quote', to_jsonb(t.items('2026-03')), '"101:1"');
  update public.entries set quote = '문장 이' where id = '00000000-0000-4000-8000-000000000102';
end $$;
set constraints all immediate;
set constraints all deferred;
do $$ begin
  perform t.eq('excerpt with items survives', to_jsonb(t.excerpt_rows('00000000-0000-4000-8000-000000000001')), '1');
  -- 마지막 항목이 빠지면 발췌집도 지워진다(문장을 지운 경우).
  update public.entries set quote = null where id = '00000000-0000-4000-8000-000000000101';
end $$;
set constraints all immediate;
set constraints all deferred;
do $$ begin
  perform t.eq('last item edited away drops excerpt', to_jsonb(t.excerpt_rows('00000000-0000-4000-8000-000000000001')), '0');
  update public.entries set quote = '문장 일' where id = '00000000-0000-4000-8000-000000000101';

  -- 달을 옮긴 경우
  perform public.save_monthly_excerpt('2026-03', array['00000000-0000-4000-8000-000000000101']::uuid[], false);
  update public.entries set date = '2026-04-20' where id = '00000000-0000-4000-8000-000000000101';
end $$;
set constraints all immediate;
set constraints all deferred;
do $$ begin
  perform t.eq('last item moved away drops excerpt', to_jsonb(t.excerpt_rows('00000000-0000-4000-8000-000000000001')), '0');
  update public.entries set date = '2026-03-20' where id = '00000000-0000-4000-8000-000000000101';

  -- 기록을 지운 경우: 하나 남아 있으면 유지, 마지막이면 함께 지운다.
  insert into public.entries(id, user_book_id, date, quote) values
    ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000011', '2026-03-25', '곧 지울 문장'),
    ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000011', '2026-03-26', '곧 지울 문장 둘');
  perform public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000109'
  ]::uuid[], false);
  delete from public.entries where id = '00000000-0000-4000-8000-000000000108';
end $$;
set constraints all immediate;
set constraints all deferred;
do $$ begin
  perform t.eq('deleted entry leaves the item list', to_jsonb(t.items('2026-03')), '"109:1"');
  delete from public.entries where id = '00000000-0000-4000-8000-000000000109';
end $$;
set constraints all immediate;
set constraints all deferred;
do $$ begin
  perform t.eq('last entry deleted drops excerpt', to_jsonb(t.excerpt_rows('00000000-0000-4000-8000-000000000001')), '0');
end $$;

-- ── 모아 보기 ───────────────────────────────────────────────
do $$
declare v_id uuid;
begin
  perform t.eq('unmade year rows: in-progress April and quote-less February are out',
    public.get_my_monthly_excerpt_year(2026),
    '[{"month":"2026-03","quoteCount":3,"excerptId":null,"isShared":false,"coverQuote":null}]');

  v_id := public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000101'
  ]::uuid[], true);
  perform t.eq('made year row counts the excerpt and covers with the first item',
    public.get_my_monthly_excerpt_year(2026),
    jsonb_build_array(jsonb_build_object('month', '2026-03', 'quoteCount', 2, 'excerptId', v_id, 'isShared', true, 'coverQuote', '문장 삼')));
  perform t.eq('empty year', public.get_my_monthly_excerpt_year(2020), '[]');
  perform t.eq('years', (select jsonb_agg(jsonb_build_array(y.year, y.excerpt_count, y.has_unmade)) from public.get_my_monthly_excerpt_years() y),
    '[[2026,1,false],[2025,0,true]]');

  -- 5월이 되면 4월이 끝난 달로 들어온다. 최신 달 먼저.
  perform t.set_today('2026-05-01');
  perform t.eq('newest month first',
    (select jsonb_agg(m ->> 'month') from jsonb_array_elements(public.get_my_monthly_excerpt_year(2026)) m),
    '["2026-04","2026-03"]');
  perform t.eq('years with an unmade month', (select jsonb_agg(jsonb_build_array(y.year, y.excerpt_count, y.has_unmade)) from public.get_my_monthly_excerpt_years() y),
    '[[2026,1,true],[2025,0,true]]');
  perform t.set_today('2026-04-01');
end $$;

-- ── RLS와 테이블 권한 ───────────────────────────────────────
select t.as_user('00000000-0000-4000-8000-000000000002');
do $$
declare n int; v_id uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01');
begin
  select count(*) into n from public.monthly_excerpts;
  if n <> 0 then raise exception 'B reads A excerpts: %', n; end if;
  select count(*) into n from public.monthly_excerpt_items;
  if n <> 0 then raise exception 'B reads A items: %', n; end if;
  delete from public.monthly_excerpts where id = v_id;
  perform t.eq('B cannot delete A excerpt', to_jsonb(t.excerpt_rows('00000000-0000-4000-8000-000000000001')), '1');
  if public.get_my_monthly_excerpt('2026-03') is not null then raise exception 'B must not get A excerpt'; end if;
end $$;

select t.as_user('00000000-0000-4000-8000-000000000001');
do $$
declare
  stmt text;
  v_id uuid := t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-03-01');
  n int;
begin
  select count(*) into n from public.monthly_excerpts;
  if n <> 1 then raise exception 'A must read own excerpt: %', n; end if;
  select count(*) into n from public.monthly_excerpt_items;
  if n <> 2 then raise exception 'A must read own items: %', n; end if;

  foreach stmt in array array[
    format($q$insert into public.monthly_excerpts(user_id, month) values ('00000000-0000-4000-8000-000000000001', '2026-01-01')$q$),
    format($q$update public.monthly_excerpts set is_shared = false where id = %L$q$, v_id),
    format($q$update public.monthly_excerpts set first_shared_at = null where id = %L$q$, v_id),
    format($q$insert into public.monthly_excerpt_items(excerpt_id, entry_id, position) values (%L, '00000000-0000-4000-8000-000000000102', 9)$q$, v_id),
    format($q$update public.monthly_excerpt_items set position = 9 where excerpt_id = %L$q$, v_id),
    format($q$delete from public.monthly_excerpt_items where excerpt_id = %L$q$, v_id)
  ] loop
    begin
      execute stmt;
      raise exception 'must be denied: %', stmt;
    exception when insufficient_privilege then null;
    end;
  end loop;

  delete from public.monthly_excerpts where id = v_id;
  perform t.eq('A can delete own excerpt', to_jsonb(t.excerpt_rows('00000000-0000-4000-8000-000000000001')), '0');
  select count(*) into n from public.monthly_excerpt_items;
  if n <> 0 then raise exception 'items must go with the excerpt: %', n; end if;
  perform 1 from public.entries where id = '00000000-0000-4000-8000-000000000101';
  if not found then raise exception 'deleting an excerpt must keep entries'; end if;
end $$;
set constraints all immediate;
set constraints all deferred;
reset role;
