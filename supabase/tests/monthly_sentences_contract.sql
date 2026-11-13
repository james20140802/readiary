-- 달마다 한 문장 계약. 메모리 안의 격리된 DB에서만 실행하고, 실패는 raise exception으로 알린다.
-- 역할: A(…001)는 주인, C(…003)·F(…006)는 수락된 친구, D(…004)는 남, E(…005)는 신청만 해 둔 사이다.
-- 오늘은 KST 2026-11-13으로 고정한다. 자료는 소유자 권한으로 넣고, 읽기·쓰기 RPC는 jwt claims로 사람을 바꿔 부른다.

-- ── 테스트 도구 ──────────────────────────────────────────────
create schema t;
grant usage on schema t to authenticated, anon;

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

-- 친구에게 가는 응답 어디에도 이 글자가 없어야 한다(비공개 기록의 id·문장·책, 본인 전용 키).
create function t.no_trace(p_label text, p_json jsonb) returns void language plpgsql as $$
declare needle text;
begin
  foreach needle in array array[
    '00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000231',
    '비공개 문장 피', '비공개 문장 큐', '비공개 책',
    'entryCount', 'source', 'rule', 'isPrivate', 'friendFallback', 'reflectionsOn'
  ] loop
    if p_json::text like '%' || needle || '%' then
      raise exception '%: leaked % in %', p_label, needle, p_json;
    end if;
  end loop;
end;
$$;

create function t.id(p_n int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(p_n::text, 12, '0'))::uuid;
$$;

-- p_viewer가 A의 일기장을 읽는다.
create function t.read(p_viewer int, p_before text default null, p_limit int default 6) returns jsonb
language plpgsql as $$
begin
  perform t.as_user(t.id(p_viewer));
  return public.get_monthly_sentences(t.id(1), p_before, p_limit);
end;
$$;

-- 응답에서 한 달의 줄. 없으면 null.
create function t.month_row(p_json jsonb, p_month text) returns jsonb language sql as $$
  select r from jsonb_array_elements(p_json -> 'rows') r where r ->> 'month' = p_month;
$$;

-- 응답의 달 목록.
create function t.months(p_json jsonb) returns jsonb language sql as $$
  select coalesce(jsonb_agg(r ->> 'month'), '[]'::jsonb) from jsonb_array_elements(p_json -> 'rows') r;
$$;

-- 한 달의 문장만 본다.
create function t.quote(p_viewer int, p_month text) returns jsonb language sql as $$
  select t.month_row(t.read(p_viewer, null, 24), p_month) -> 'quote';
$$;

create function t.set_today(p_date date) returns void language plpgsql as $$
begin
  execute format(
    'create or replace function public.monthly_excerpt_kst_today() returns date
     language sql stable set search_path = '''' as $f$ select %L::date $f$', p_date);
end;
$$;

create function t.fails(p_label text, p_sql text, p_message text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm <> p_message then raise exception '%: got error % want %', p_label, sqlerrm, p_message; end if;
    return;
  end;
  raise exception '%: expected error %', p_label, p_message;
end;
$$;

select t.set_today('2026-11-13');
update public.feature_rollouts set enabled = true, percentage = 100 where key = 'entry_reflections';

-- ── 자료 ────────────────────────────────────────────────────
insert into auth.users(id) select t.id(n) from unnest(array[1, 3, 4, 5, 6]) n;
insert into public.profiles(id, name, nickname, tag) select id, 'Test', id::text, '0001' from auth.users;
insert into public.books(id, title, author) values
  (t.id(10), '공개 책', '지은이'), (t.id(20), '비공개 책', '숨은 이'), (t.id(30), '남의 책', '남');
insert into public.user_books(id, user_id, book_id) values
  (t.id(11), t.id(1), t.id(10)), (t.id(21), t.id(1), t.id(20)), (t.id(31), t.id(3), t.id(30));
insert into public.friends(user_id, friend_id, status, accepted_at) values
  (t.id(1), t.id(3), 'accepted', now()), (t.id(6), t.id(1), 'accepted', now());
insert into public.friends(user_id, friend_id, status) values (t.id(5), t.id(1), 'pending');

insert into public.entries(id, user_book_id, date, quote, note, is_private, from_page, created_at) values
  -- 11월: 좋아요는 201, 생각은 202, 최근은 203. 204는 생각만, 205는 나만 보기.
  (t.id(201), t.id(11), '2026-11-02', '십일월 에이', null, false, 184, '2026-11-02 01:00+00'),
  (t.id(202), t.id(11), '2026-11-05', '십일월 비', null, false, null, '2026-11-05 01:00+00'),
  (t.id(203), t.id(11), '2026-11-09', '십일월 씨', null, false, null, '2026-11-09 01:00+00'),
  (t.id(204), t.id(11), '2026-11-10', null, '생각만 남김', false, null, '2026-11-10 01:00+00'),
  (t.id(205), t.id(21), '2026-11-08', '비공개 문장 피', null, true, null, '2026-11-08 01:00+00'),
  -- 10월: 좋아요 없음. 최근은 212.
  (t.id(211), t.id(11), '2026-10-03', '시월 에이', null, false, null, '2026-10-03 01:00+00'),
  (t.id(212), t.id(11), '2026-10-07', '시월 비', null, false, null, '2026-10-07 01:00+00'),
  -- 9월: 동점. 221·222는 같은 날이고 222를 나중에 만들었다. 223은 더 늦은 날.
  (t.id(221), t.id(11), '2026-09-10', '구월 에이', null, false, null, '2026-09-10 01:00+00'),
  (t.id(222), t.id(11), '2026-09-10', '구월 비', null, false, null, '2026-09-10 02:00+00'),
  (t.id(223), t.id(11), '2026-09-12', '구월 씨', null, false, null, '2026-09-12 01:00+00'),
  -- 8월: 나만 보기 기록뿐. 7월은 비어 있다.
  (t.id(231), t.id(21), '2026-08-05', '비공개 문장 큐', null, true, null, '2026-08-05 01:00+00'),
  -- 6월: 241은 비공개 생각 5개, 242는 공개 생각 1개.
  (t.id(241), t.id(11), '2026-06-03', '유월 피', null, false, null, '2026-06-03 01:00+00'),
  (t.id(242), t.id(11), '2026-06-02', '유월 큐', null, false, null, '2026-06-02 01:00+00'),
  (t.id(251), t.id(11), '2026-05-05', '오월 문장', null, false, null, '2026-05-05 01:00+00'),
  (t.id(261), t.id(11), '2026-04-05', '사월 문장', null, false, null, '2026-04-05 01:00+00'),
  (t.id(271), t.id(11), '2026-03-05', '삼월 문장', null, false, null, '2026-03-05 01:00+00'),
  (t.id(281), t.id(11), '2026-02-05', '이월 문장', null, false, null, '2026-02-05 01:00+00'),
  -- 친구 C의 기록(남의 기록을 고르지 못하는지 본다)
  (t.id(301), t.id(31), '2026-11-03', '남의 문장', null, false, null, '2026-11-03 01:00+00');

insert into public.likes(user_id, entry_id) values
  (t.id(3), t.id(201)), (t.id(6), t.id(201)), (t.id(3), t.id(202)),
  (t.id(3), t.id(221)), (t.id(3), t.id(222)), (t.id(3), t.id(223));

insert into public.entry_reflections(id, entry_id, user_id, body, is_private)
  select gen_random_uuid(), t.id(202), t.id(1), '십일월 생각 ' || n, true from generate_series(1, 3) n;
insert into public.entry_reflections(id, entry_id, user_id, body, is_private)
  select gen_random_uuid(), t.id(241), t.id(1), '유월 비공개 생각 ' || n, true from generate_series(1, 5) n;
insert into public.entry_reflections(id, entry_id, user_id, body, is_private) values
  (gen_random_uuid(), t.id(242), t.id(1), '유월 공개 생각', false);

-- ── 권한: 부를 수 있는 사람과 정의 ──────────────────────────
do $$
declare
  fn text;
  v_bad text;
begin
  foreach fn in array array[
    'public.get_monthly_sentences(uuid,text,integer)',
    'public.get_monthly_sentence_candidates(text,integer,integer)',
    'public.set_monthly_sentence(text,uuid)',
    'public.set_monthly_sentence_rule(text)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;

  -- 내부 함수는 아무도 직접 부르지 못한다.
  select string_agg(p.proname, ',') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname like 'monthly\_sentence\_%'
    and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
  if v_bad is not null then raise exception 'internal functions must not be executable: %', v_bad; end if;

  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('get_monthly_sentences', 'get_monthly_sentence_candidates',
                      'set_monthly_sentence', 'set_monthly_sentence_rule')
    and (not p.prosecdef or not coalesce(p.proconfig, '{}') @> array['search_path=""']);
  if v_bad is not null then raise exception 'must be security definer with empty search_path: %', v_bad; end if;

  -- 로그인하지 않으면 거부한다.
  perform set_config('request.jwt.claims', '', false);
  perform t.fails('anon read', $q$select public.get_monthly_sentences(t.id(1))$q$, 'Authentication required');
  perform t.fails('anon candidates', $q$select public.get_monthly_sentence_candidates('2026-11')$q$, 'Authentication required');
end;
$$;

-- ── default rule: 설정이 없으면 좋아요 ───────────────────────
do $$
declare v jsonb := t.read(1);
begin
  perform t.eq('own mode', v -> 'mode', '"own"');
  perform t.eq('default rule', v -> 'rule', '"likes"');
  perform t.eq('reflections on', v -> 'reflectionsOn', 'true');
  perform t.eq('own first page months', t.months(v),
    '["2026-11","2026-10","2026-09","2026-08","2026-07","2026-06"]');
  perform t.eq('own first page next', v -> 'nextBefore', '"2026-06"');
  perform t.eq('nov row', t.month_row(v, '2026-11'), jsonb_build_object(
    'month', '2026-11', 'entryId', t.id(201), 'quote', '십일월 에이', 'bookTitle', '공개 책',
    'fromPage', 184, 'toPage', null, 'source', 'auto', 'entryCount', 5, 'isPrivate', false,
    'friendFallback', null, 'excerpt', 'none'));
  -- 좋아요가 하나도 없는 달은 가장 최근 문장
  perform t.eq('oct no likes -> recent', t.month_row(v, '2026-10') -> 'quote', '"시월 비"');
  perform t.eq('oct unmade', t.month_row(v, '2026-10') -> 'excerpt', '"unmade"');
  -- 나만 보기 기록뿐인 달도 내게는 보인다
  perform t.eq('aug own', t.month_row(v, '2026-08') -> 'quote', '"비공개 문장 큐"');
  perform t.eq('aug private', t.month_row(v, '2026-08') -> 'isPrivate', 'true');
  -- 빈 달
  perform t.eq('jul empty', t.month_row(v, '2026-07'), jsonb_build_object(
    'month', '2026-07', 'entryId', null, 'quote', null, 'bookTitle', null,
    'fromPage', null, 'toPage', null, 'source', null, 'entryCount', 0, 'isPrivate', false,
    'friendFallback', null, 'excerpt', 'none'));
end;
$$;

-- ── tie: 동점이면 더 늦은 날, 날도 같으면 나중에 만든 것 ─────
do $$
begin
  perform t.eq('tie by date', t.quote(1, '2026-09'), '"구월 씨"');
  delete from public.likes where entry_id = t.id(223);
  perform t.eq('tie by created_at', t.quote(1, '2026-09'), '"구월 비"');
end;
$$;

-- ── own paging: 첫 기록의 달에서 끝난다 ──────────────────────
do $$
declare v jsonb := t.read(1, '2026-06');
begin
  perform t.eq('own second page', t.months(v), '["2026-05","2026-04","2026-03","2026-02"]');
  perform t.eq('own second page next', v -> 'nextBefore', 'null');
  perform t.eq('bad before', t.read(1, '2026-13') -> 'rows', '[]');
  perform t.eq('limit clamp', to_jsonb(jsonb_array_length(t.read(1, null, 0) -> 'rows')), '1');
end;
$$;

-- ── rules: 기준을 바꾼다 ─────────────────────────────────────
do $$
begin
  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence_rule('reflections');
  perform t.eq('rule stored', t.read(1) -> 'rule', '"reflections"');
  perform t.eq('reflections rule', t.quote(1, '2026-11'), '"십일월 비"');
  -- friend reflections: 본인에게는 비공개 생각 5개인 문장, 친구에게는 공개 생각 1개인 문장
  perform t.eq('own counts all thoughts', t.quote(1, '2026-06'), '"유월 피"');
  perform t.eq('friend counts readable thoughts', t.quote(3, '2026-06'), '"유월 큐"');

  -- reflections off: 꺼지면 최근으로 계산한다
  update public.feature_rollouts set enabled = false where key = 'entry_reflections';
  perform t.eq('reflections off flag', t.read(1) -> 'reflectionsOn', 'false');
  perform t.eq('reflections off -> recent', t.quote(1, '2026-11'), '"십일월 씨"');
  perform t.eq('reflections off friend -> recent', t.quote(3, '2026-06'), '"유월 피"');
  update public.feature_rollouts set enabled = true where key = 'entry_reflections';

  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence_rule('recent');
  perform t.eq('recent rule', t.quote(1, '2026-11'), '"십일월 씨"');
  perform t.eq('recent rule friend', t.quote(3, '2026-11'), '"십일월 씨"');
  perform t.as_user(t.id(1));
  perform t.fails('bad rule', $q$select public.set_monthly_sentence_rule('random')$q$, 'invalid_rule');
  perform public.set_monthly_sentence_rule('likes');
  perform t.eq('back to likes', t.quote(1, '2026-11'), '"십일월 에이"');
end;
$$;

-- ── pick: 직접 고르고 되돌린다 ───────────────────────────────
do $$
declare v jsonb;
begin
  perform t.as_user(t.id(1));
  v := public.set_monthly_sentence('2026-11', t.id(203));
  perform t.eq('pick returns row', v, jsonb_build_object(
    'month', '2026-11', 'entryId', t.id(203), 'quote', '십일월 씨', 'bookTitle', '공개 책',
    'fromPage', null, 'toPage', null, 'source', 'picked', 'entryCount', 5, 'isPrivate', false,
    'friendFallback', null, 'excerpt', 'none'));
  perform t.eq('pick shows to friend', t.quote(3, '2026-11'), '"십일월 씨"');

  -- 기준을 바꿔도 고른 달은 그대로
  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence_rule('reflections');
  perform t.eq('pick survives rule change', t.quote(1, '2026-11'), '"십일월 씨"');
  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence_rule('likes');

  -- 고를 수 없는 기록
  perform t.fails('other owner', format('select public.set_monthly_sentence(%L, %L)', '2026-11', t.id(301)), 'invalid_entry');
  perform t.fails('note only', format('select public.set_monthly_sentence(%L, %L)', '2026-11', t.id(204)), 'invalid_entry');
  perform t.fails('other month', format('select public.set_monthly_sentence(%L, %L)', '2026-11', t.id(212)), 'invalid_entry');
  perform t.fails('bad month', format('select public.set_monthly_sentence(%L, %L)', '2026-1', t.id(203)), 'invalid_month');
  perform t.eq('failed picks keep the pick', t.quote(1, '2026-11'), '"십일월 씨"');

  -- 후보 목록
  v := public.get_monthly_sentence_candidates('2026-11');
  perform t.eq('candidates picked', v -> 'pickedEntryId', to_jsonb(t.id(203)));
  perform t.eq('candidates total', v -> 'total', '4');
  perform t.eq('candidates public', v -> 'publicCount', '3');
  perform t.eq('candidates order', (select jsonb_agg(i ->> 'quote') from jsonb_array_elements(v -> 'items') i),
    '["십일월 씨","비공개 문장 피","십일월 비","십일월 에이"]');
  perform t.eq('candidate shape', v -> 'items' -> 1, jsonb_build_object(
    'entryId', t.id(205), 'quote', '비공개 문장 피', 'bookTitle', '비공개 책', 'date', '2026-11-08', 'isPrivate', true));
  perform t.eq('candidates offset', to_jsonb(jsonb_array_length(public.get_monthly_sentence_candidates('2026-11', 3, 30) -> 'items')), '1');
  perform t.fails('candidates bad month', $q$select public.get_monthly_sentence_candidates('11월')$q$, 'invalid_month');
  -- 남이 부르면 자기 것만 본다
  perform t.as_user(t.id(4));
  perform t.eq('candidates of a stranger are their own', public.get_monthly_sentence_candidates('2026-11') -> 'total', '0');

  -- 되돌리기
  perform t.as_user(t.id(1));
  v := public.set_monthly_sentence('2026-11', null);
  perform t.eq('unpick returns auto row', v -> 'source', '"auto"');
  perform t.eq('unpick quote', v -> 'quote', '"십일월 에이"');
  if exists (select 1 from public.monthly_sentence_picks) then raise exception 'unpick must delete the row'; end if;
end;
$$;

-- ── excerpt cover: 엮은 달은 표지 문장 ───────────────────────
do $$
declare v jsonb;
begin
  perform t.as_user(t.id(1));
  perform public.save_monthly_excerpt('2026-10', array[t.id(211), t.id(212)], false);
  v := t.month_row(t.read(1), '2026-10');
  perform t.eq('cover quote', v -> 'quote', '"시월 에이"');
  perform t.eq('cover source', v -> 'source', '"excerpt"');
  perform t.eq('cover made', v -> 'excerpt', '"made"');

  -- friend excerpt: 공유하지 않은 발췌집은 친구에게 표지가 되지 않는다
  v := t.read(3);
  perform t.eq('unshared excerpt -> auto for friend', t.month_row(v, '2026-10') -> 'quote', '"시월 비"');
  perform t.eq('unshared hasExcerpt', t.month_row(v, '2026-10') -> 'hasExcerpt', 'false');
  perform t.eq('unshared hasAnyExcerpt', v -> 'hasAnyExcerpt', 'false');

  perform t.as_user(t.id(1));
  perform public.save_monthly_excerpt('2026-10', array[t.id(211), t.id(212)], true);
  v := t.read(3);
  perform t.eq('shared excerpt -> cover for friend', t.month_row(v, '2026-10') -> 'quote', '"시월 에이"');
  perform t.eq('shared hasExcerpt', t.month_row(v, '2026-10') -> 'hasExcerpt', 'true');
  perform t.eq('shared hasAnyExcerpt', v -> 'hasAnyExcerpt', 'true');

  -- 고르면 표지를 이기고, 발췌집은 그대로다
  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence('2026-10', t.id(212));
  perform t.eq('pick beats cover', t.month_row(t.read(1), '2026-10') -> 'source', '"picked"');
  perform t.eq('pick beats cover for friend', t.quote(3, '2026-10'), '"시월 비"');
  perform t.eq('friend still sees excerpt', t.month_row(t.read(3), '2026-10') -> 'hasExcerpt', 'true');
  perform t.eq('excerpt untouched',
    (select jsonb_agg(i.entry_id order by i.position) from public.monthly_excerpt_items i), jsonb_build_array(t.id(211), t.id(212)));
end;
$$;

-- ── stale pick: 고른 뒤 기록이 바뀐다 ────────────────────────
do $$
declare v jsonb;
begin
  -- 문장을 지워 생각만 남기면 선택이 무시된다
  update public.entries set quote = null, note = '생각만' where id = t.id(212);
  v := t.month_row(t.read(1), '2026-10');
  perform t.eq('blank quote -> cover', v -> 'source', '"excerpt"');
  perform t.eq('blank quote candidates', (public.get_monthly_sentence_candidates('2026-10')) -> 'pickedEntryId', 'null');
  update public.entries set quote = '시월 비', note = null where id = t.id(212);
  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence('2026-10', null);

  -- 날짜를 다른 달로 옮기면 그 달의 선택이 무효이고, 옮겨 간 달의 선택도 아니다
  perform public.set_monthly_sentence('2026-11', t.id(203));
  update public.entries set date = '2026-07-15' where id = t.id(203);
  perform t.eq('moved pick -> auto', t.month_row(t.read(1), '2026-11') -> 'source', '"auto"');
  perform t.eq('moved pick -> auto quote', t.quote(1, '2026-11'), '"십일월 에이"');
  perform t.eq('moved entry is not picked there', t.month_row(t.read(1), '2026-07') -> 'source', '"auto"');
  update public.entries set date = '2026-11-09' where id = t.id(203);
  perform t.eq('moved back -> picked again', t.month_row(t.read(1), '2026-11') -> 'source', '"picked"');
  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence('2026-11', null);

  -- 기록을 지우면 선택도 사라진다
  perform public.set_monthly_sentence('2026-05', t.id(251));
  delete from public.entries where id = t.id(251);
  if exists (select 1 from public.monthly_sentence_picks where month = '2026-05-01') then
    raise exception 'pick must cascade with the entry';
  end if;
  insert into public.entries(id, user_book_id, date, quote, is_private, created_at)
    values (t.id(251), t.id(11), '2026-05-05', '오월 문장', false, '2026-05-05 01:00+00');
end;
$$;

-- ── private pick · private-only month ───────────────────────
do $$
declare v jsonb;
begin
  perform t.as_user(t.id(1));
  v := public.set_monthly_sentence('2026-11', t.id(205));
  perform t.eq('private pick own', v -> 'quote', '"비공개 문장 피"');
  perform t.eq('private pick flag', v -> 'isPrivate', 'true');
  perform t.eq('private pick fallback other', v -> 'friendFallback', '"other"');
  perform t.eq('friend sees another sentence', t.quote(3, '2026-11'), '"십일월 에이"');

  perform t.as_user(t.id(1));
  v := public.set_monthly_sentence('2026-08', t.id(231));
  perform t.eq('private pick fallback none', v -> 'friendFallback', '"none"');

  -- 고른 공개 기록을 나만 보기로 바꾸면 선택은 남고 친구 화면만 바뀐다
  perform public.set_monthly_sentence('2026-04', t.id(261));
  update public.entries set is_private = true where id = t.id(261);
  perform t.eq('made private keeps pick', t.month_row(t.read(1, null, 24), '2026-04') -> 'source', '"picked"');
  perform t.eq('made private fallback', t.month_row(t.read(1, null, 24), '2026-04') -> 'friendFallback', '"none"');
  perform t.eq('made private hidden from friend', t.month_row(t.read(3, null, 24), '2026-04'), null);
  update public.entries set is_private = false where id = t.id(261);
  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence('2026-04', null);

  -- 친구 응답: 8월 줄이 없고, 비공개에서 나온 값과 본인 전용 키가 없다
  v := t.read(3, null, 24);
  perform t.eq('friend mode', v -> 'mode', '"friend"');
  perform t.eq('friend months', t.months(v),
    '["2026-11","2026-10","2026-09","2026-06","2026-05","2026-04","2026-03","2026-02"]');
  perform t.no_trace('friend response', v);
  perform t.eq('friend row shape', t.month_row(v, '2026-11'), jsonb_build_object(
    'month', '2026-11', 'entryId', t.id(201), 'quote', '십일월 에이', 'bookTitle', '공개 책',
    'fromPage', 184, 'toPage', null, 'hasExcerpt', false));
  -- 신청한 쪽이 반대인 친구(F)도 같다
  perform t.eq('friend F', t.months(t.read(6, null, 24)), t.months(v));

  -- friend paging: 보이는 줄 여섯 개, 사이의 비공개 전용 달은 세지 않는다
  v := t.read(3);
  perform t.eq('friend first page', t.months(v),
    '["2026-11","2026-10","2026-09","2026-06","2026-05","2026-04"]');
  perform t.eq('friend first next', v -> 'nextBefore', '"2026-04"');
  perform t.no_trace('friend first page', v);
  v := t.read(3, '2026-04');
  perform t.eq('friend second page', t.months(v), '["2026-03","2026-02"]');
  perform t.eq('friend second next', v -> 'nextBefore', 'null');
  -- 남은 것이 비공개 전용 달뿐이면 더 없다고 답한다
  perform t.eq('no next into private-only months', t.read(3, '2026-10', 1) -> 'nextBefore', '"2026-09"');
  perform t.eq('private-only tail', t.read(3, '2026-09', 1) -> 'rows' -> 0 -> 'month', '"2026-06"');

  perform t.as_user(t.id(1));
  perform public.set_monthly_sentence('2026-11', null);
  perform public.set_monthly_sentence('2026-08', null);
end;
$$;

-- ── unfriended · stranger ────────────────────────────────────
do $$
begin
  perform t.eq('stranger', t.read(4), '{"mode":"none","rows":[],"nextBefore":null}');
  perform t.eq('pending request', t.read(5), '{"mode":"none","rows":[],"nextBefore":null}');
  delete from public.friends where user_id = t.id(6) and friend_id = t.id(1);
  perform t.eq('unfriended', t.read(6), '{"mode":"none","rows":[],"nextBefore":null}');
  insert into public.friends(user_id, friend_id, status, accepted_at) values (t.id(6), t.id(1), 'accepted', now());
end;
$$;

-- ── month boundary · 24개월 바닥 ─────────────────────────────
do $$
declare v jsonb;
begin
  perform t.set_today('2026-12-01');
  v := t.read(1);
  perform t.eq('new month first', v -> 'rows' -> 0 -> 'month', '"2026-12"');
  perform t.eq('new month none', v -> 'rows' -> 0 -> 'excerpt', '"none"');
  perform t.eq('last month unmade', t.month_row(v, '2026-11') -> 'excerpt', '"unmade"');
  perform t.set_today('2026-11-13');
  perform t.eq('this month not unmade', t.month_row(t.read(1), '2026-11') -> 'excerpt', '"none"');

  -- 24개월보다 오래된 기록이 있으면 바닥(2024-12)에서 끝난다
  insert into public.entries(id, user_book_id, date, quote, is_private)
    values (t.id(291), t.id(11), '2024-01-05', '오래된 문장', false);
  v := t.read(1, '2025-02');
  perform t.eq('floor months', t.months(v), '["2025-01","2024-12"]');
  perform t.eq('floor next', v -> 'nextBefore', 'null');
  perform t.eq('floor for friend', t.months(t.read(3, '2026-02')), '[]');
  delete from public.entries where id = t.id(291);
end;
$$;

-- ── pending deletion ─────────────────────────────────────────
do $$
begin
  -- 좋아요한 계정이 유예에 들어가면 그 좋아요는 세지 않는다: 201(2→1)과 202(1)가 동점이 되어 더 최근인 202
  insert into public.account_deletions (user_id, purge_after) values (t.id(6), now());
  perform t.eq('inactive liker not counted', t.quote(1, '2026-11'), '"십일월 비"');
  delete from public.account_deletions where user_id = t.id(6);
  perform t.eq('liker back', t.quote(1, '2026-11'), '"십일월 에이"');

  -- 주인이 유예에 들어가면 친구에게 보이지 않고, 주인은 쓰지 못한다
  insert into public.account_deletions (user_id, purge_after) values (t.id(1), now());
  perform t.eq('owner pending hidden', t.read(3), '{"mode":"none","rows":[],"nextBefore":null}');
  perform t.as_user(t.id(1));
  begin
    perform public.set_monthly_sentence('2026-11', t.id(203));
    raise exception 'pending owner must not pick';
  exception when others then
    if sqlerrm = 'pending owner must not pick' then raise; end if;
  end;
  begin
    perform public.set_monthly_sentence_rule('recent');
    raise exception 'pending owner must not set rule';
  exception when others then
    if sqlerrm = 'pending owner must not set rule' then raise; end if;
  end;
  delete from public.account_deletions where user_id = t.id(1);
  perform t.eq('owner back', t.read(3) -> 'mode', '"friend"');
end;
$$;

-- ── direct writes: 테이블은 본인 읽기만 ──────────────────────
select t.as_user(t.id(1));
select public.set_monthly_sentence('2026-11', t.id(203));
select public.set_monthly_sentence_rule('recent');

set role authenticated;
do $$
declare n int;
begin
  perform t.as_user(t.id(1));
  select count(*) into n from public.monthly_sentence_picks;
  if n <> 1 then raise exception 'owner must read own pick, got %', n; end if;
  select count(*) into n from public.monthly_sentence_settings;
  if n <> 1 then raise exception 'owner must read own setting, got %', n; end if;

  perform t.as_user(t.id(3));
  select count(*) into n from public.monthly_sentence_picks;
  if n <> 0 then raise exception 'friend must not read picks, got %', n; end if;
  select count(*) into n from public.monthly_sentence_settings;
  if n <> 0 then raise exception 'friend must not read settings, got %', n; end if;

  perform t.as_user(t.id(1));
  perform t.fails('direct insert pick',
    format('insert into public.monthly_sentence_picks(user_id, month, entry_id) values (%L, %L, %L)', t.id(1), '2026-10-01', t.id(211)),
    'permission denied for table monthly_sentence_picks');
  perform t.fails('direct update pick', $q$update public.monthly_sentence_picks set month = '2026-10-01'$q$,
    'permission denied for table monthly_sentence_picks');
  perform t.fails('direct delete pick', $q$delete from public.monthly_sentence_picks$q$,
    'permission denied for table monthly_sentence_picks');
  perform t.fails('direct insert setting',
    format('insert into public.monthly_sentence_settings(user_id, rule) values (%L, %L)', t.id(3), 'recent'),
    'permission denied for table monthly_sentence_settings');
  perform t.fails('direct update setting', $q$update public.monthly_sentence_settings set rule = 'likes'$q$,
    'permission denied for table monthly_sentence_settings');
end;
$$;
reset role;
