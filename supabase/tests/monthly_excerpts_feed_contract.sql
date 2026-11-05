-- 친구 피드에 뜨는 달의 발췌집 계약. 메모리 안의 격리된 DB에서만 실행하고, 실패는 raise exception으로 알린다.
-- 역할: A(…001)·B(…002)는 글쓴이, C(…003)는 A·B의 수락된 친구, D(…004)는 친구가 아니고, E(…005)는 A에게 신청만 했다.

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

create function t.state_of(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate;
end;
$$;

create function t.excerpt_id(p_user uuid, p_month date) returns uuid language sql security definer as $$
  select id from public.monthly_excerpts where user_id = p_user and month = p_month;
$$;

-- 피드 한 쪽을 읽기 쉬운 이름 목록으로: 기록은 문장, 발췌집은 'X:달:주인 끝자리'.
create function t.labels(p_feed jsonb) returns jsonb language sql as $$
  select coalesce(jsonb_agg(
    case i.v ->> 'kind'
      when 'entry' then to_jsonb(i.v -> 'entry' ->> 'quote')
      else to_jsonb('X:' || (i.v ->> 'month') || ':' || right(i.v -> 'profile' ->> 'id', 1))
    end order by i.n), '[]'::jsonb)
  from jsonb_array_elements(p_feed) with ordinality as i(v, n);
$$;

-- 지금 역할이 limit 단위로 끝까지 읽은 이름 목록.
create function t.walk(p_limit int) returns jsonb language plpgsql as $$
declare
  v_page int := 0;
  v_rows jsonb;
  v_all jsonb := '[]'::jsonb;
begin
  loop
    v_rows := public.get_social_feed_items(v_page, p_limit);
    exit when jsonb_array_length(v_rows) = 0;
    v_all := v_all || t.labels(v_rows);
    v_page := v_page + 1;
    if v_page > 50 then raise exception 'walk did not end'; end if;
  end loop;
  return v_all;
end;
$$;

-- 지금 피드에서 발췌집 항목 하나.
create function t.card(p_month text, p_owner_tail text) returns jsonb language sql as $$
  select i.v
  from jsonb_array_elements(public.get_social_feed_items(0, 50)) as i(v)
  where i.v ->> 'kind' = 'monthly_excerpt'
    and i.v ->> 'month' = p_month
    and right(i.v -> 'profile' ->> 'id', 1) = p_owner_tail;
$$;

-- ── 자료 ────────────────────────────────────────────────────
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004'),
  ('00000000-0000-4000-8000-000000000005');
insert into public.profiles(id, name, nickname, tag) select id, 'Test', id::text, '0001' from auth.users;
insert into public.books(id, title, author) values
  ('00000000-0000-4000-8000-000000000010', '공개 책', '지은이'),
  ('00000000-0000-4000-8000-000000000020', '비공개만 있는 책', '숨은이'),
  ('00000000-0000-4000-8000-000000000030', '또 다른 공개 책', '지은이');
insert into public.user_books(id, user_id, book_id) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010');
insert into public.friends(user_id, friend_id, status, accepted_at) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'accepted', now()),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'accepted', now());
insert into public.friends(user_id, friend_id, status) values
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'pending');

insert into public.entries(id, user_book_id, date, quote, note, is_private, created_at) values
  -- A의 3월: 순서가 [비공개 p, 공개 a, 비공개 q, 공개 b, 공개 c]가 된다. p·q는 다른 책.
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000012', '2026-03-01', '비공개 표지 후보', null, true, '2026-03-01 10:00+09'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000011', '2026-03-02', '공개 문장 가', null, false, '2026-03-02 10:00+09'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000012', '2026-03-03', '비공개 가운데', null, true, '2026-03-03 10:00+09'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000011', '2026-03-04', '공개 문장 나', null, false, '2026-03-04 10:00+09'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000013', '2026-03-05', '공개 문장 다', null, false, '2026-03-05 10:00+09'),
  -- A의 2월
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000011', '2026-02-02', '이월 문장', null, false, '2026-02-02 10:00+09'),
  -- A의 1월: 나만 보기로 남길 권
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000011', '2026-01-02', '일월 문장', null, false, '2026-01-02 10:00+09'),
  -- A의 12월: 비공개 문장뿐인 권
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000011', '2025-12-02', '십이월 비공개', null, true, '2025-12-02 10:00+09'),
  -- B의 3월
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000021', '2026-03-02', '비 삼월', null, false, '2026-03-02 09:00+09'),
  -- 4월의 소식
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000011', '2026-04-10', '사월 십일', null, false, '2026-04-10 10:00+09'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000011', '2026-04-08', '사월 팔일', null, false, '2026-04-08 10:00+09'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000021', '2026-04-06', '사월 육일', null, false, '2026-04-06 10:00+09'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000011', '2026-04-09', '사월 비공개', null, true, '2026-04-09 10:00+09');

-- ── 권한과 정의 ─────────────────────────────────────────────
do $$
declare
  fn text;
  v_bad text;
begin
  foreach fn in array array[
    'public.get_social_feed_items(integer,integer)',
    'public.friend_feed_monthly_excerpts(bigint)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;

  select string_agg(p.proname, ',') into v_bad
  from pg_proc p
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('get_social_feed_items', 'friend_feed_monthly_excerpts')
    and (a.grantee = 0 or a.grantee = 'anon'::regrole);
  if v_bad is not null then raise exception 'proacl must not grant public or anon: %', v_bad; end if;

  -- 내부 함수는 여전히 아무도 직접 부르지 못한다.
  if has_function_privilege('authenticated', 'public.monthly_excerpt_visible_items(uuid)', 'execute') then
    raise exception 'visible items must stay internal';
  end if;

  -- 피드는 호출자 권한(기록·좋아요의 RLS를 그대로 탄다), 도우미만 정의자다.
  perform 1 from pg_proc where oid = 'public.get_social_feed_items(integer,integer)'::regprocedure and not prosecdef;
  if not found then raise exception 'feed must be security invoker'; end if;
  perform 1 from pg_proc where oid = 'public.friend_feed_monthly_excerpts(bigint)'::regprocedure and prosecdef;
  if not found then raise exception 'helper must be security definer'; end if;

  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('get_social_feed_items', 'friend_feed_monthly_excerpts')
    and not coalesce(p.proconfig @> array['search_path=""'], false);
  if v_bad is not null then raise exception 'empty search_path required: %', v_bad; end if;

  -- 도우미는 보는 사람을 인자로 받지 않는다. 인자는 개수 하나뿐이다.
  perform 1 from pg_proc
  where oid = 'public.friend_feed_monthly_excerpts(bigint)'::regprocedure
    and pronargs = 1 and proargnames[1] = 'p_limit';
  if not found then raise exception 'helper must take only a limit'; end if;

  -- 옛 RPC는 배포가 끝날 때까지 남아 있다.
  perform 'public.get_social_feed(integer,integer)'::regprocedure;
end $$;

set role anon;
do $$
begin
  perform t.eq('anon feed denied', to_jsonb(t.state_of('select public.get_social_feed_items(0, 10)')), '"42501"');
  perform t.eq('anon helper denied', to_jsonb(t.state_of('select * from public.friend_feed_monthly_excerpts(10)')), '"42501"');
end $$;
reset role;

-- ── 아직 엮지 않았으면 기록만 ───────────────────────────────
set role authenticated;
do $$
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('entries only before any excerpt',
    t.walk(50),
    '["사월 십일","사월 팔일","사월 육일","공개 문장 다","공개 문장 나","공개 문장 가","비 삼월","이월 문장","일월 문장"]');
end $$;

-- A와 B가 엮는다. 1월은 나만 보기다. 12월은 공개로 엮은 뒤 문장을 비공개로 돌려 공개 문장이 없는 권이 된다.
reset role;
update public.entries set is_private = false where id = '00000000-0000-4000-8000-000000000108';
set role authenticated;
select t.as_user('00000000-0000-4000-8000-000000000001');
select public.save_monthly_excerpt('2026-03', array[
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000105'
]::uuid[], true);
select public.save_monthly_excerpt('2026-02', array['00000000-0000-4000-8000-000000000106']::uuid[], true);
select public.save_monthly_excerpt('2026-01', array['00000000-0000-4000-8000-000000000107']::uuid[], false);
select public.save_monthly_excerpt('2025-12', array['00000000-0000-4000-8000-000000000108']::uuid[], true);
select t.as_user('00000000-0000-4000-8000-000000000002');
select public.save_monthly_excerpt('2026-03', array['00000000-0000-4000-8000-000000000109']::uuid[], true);
reset role;
update public.entries set is_private = true where id = '00000000-0000-4000-8000-000000000108';

-- 처음 공개한 시각을 소식 사이에 놓는다. 시계에 기대지 않게 바로 고친다.
update public.monthly_excerpts set first_shared_at = '2026-04-09 10:00+09'
  where user_id = '00000000-0000-4000-8000-000000000001' and month = '2026-03-01';
update public.monthly_excerpts set first_shared_at = '2026-04-07 10:00+09'
  where user_id = '00000000-0000-4000-8000-000000000001' and month = '2026-02-01';
update public.monthly_excerpts set first_shared_at = '2026-04-05 10:00+09'
  where user_id = '00000000-0000-4000-8000-000000000002' and month = '2026-03-01';
update public.monthly_excerpts set first_shared_at = '2026-04-11 10:00+09'
  where user_id = '00000000-0000-4000-8000-000000000001' and month = '2025-12-01';

-- ── 친구 피드: 한 번씩, first_shared_at 순서로 기록과 섞인다 ──
set role authenticated;
do $$
declare
  v_full jsonb := '["사월 십일","X:2026-03:1","사월 팔일","X:2026-02:1","사월 육일","X:2026-03:2","공개 문장 다","공개 문장 나","공개 문장 가","비 삼월","이월 문장","일월 문장"]';
  v_card jsonb;
  v_size int;
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('mixed by time, once each, no solo-private or all-private book', t.walk(50), v_full);

  -- 페이지 경계에서 중복·누락 없음
  foreach v_size in array array[1, 2, 3, 5, 7, 12, 13] loop
    perform t.eq('walk ' || v_size, t.walk(v_size), v_full);
  end loop;

  -- 표지와 수에 비공개 없음: 표지는 공개 문장 중 가장 앞, 수는 보이는 문장·책 기준
  v_card := t.card('2026-03', '1');
  perform t.eq('cover skips private', v_card -> 'coverQuote', '"공개 문장 가"');
  perform t.eq('cover source belongs to cover quote', v_card -> 'coverBookTitle', '"공개 책"');
  perform t.eq('quote count', v_card -> 'quoteCount', '3');
  perform t.eq('book count', v_card -> 'bookCount', '2');
  perform t.eq('shared at', to_jsonb((v_card ->> 'sharedAt')::timestamptz = '2026-04-09 10:00+09'), 'true');
  perform t.eq('month', v_card -> 'month', '"2026-03"');
  perform t.eq('profile joined', v_card -> 'profile' -> 'id', '"00000000-0000-4000-8000-000000000001"');
  perform t.eq('profile shape',
    (select jsonb_agg(k order by k) from jsonb_object_keys(v_card -> 'profile') k),
    '["bio","created_at","id","name","nickname","profile_image","tag"]');

  -- 카드의 키는 약속한 것뿐이다. 항목 목록·공개 여부·비공개 수를 담지 않는다.
  perform t.eq('card keys',
    (select jsonb_agg(k order by k) from jsonb_object_keys(v_card) k),
    '["bookCount","coverBookTitle","coverQuote","id","initialCommentCount","initialLikeCount","initialLiked","kind","month","profile","quoteCount","sharedAt"]');

  -- 피드 어디에도 비공개의 흔적이 없다.
  if public.get_social_feed_items(0, 50)::text ~ '비공개|숨은이|00000000-0000-4000-8000-000000000101|00000000-0000-4000-8000-000000000103' then
    raise exception 'private trace in feed';
  end if;

  -- 기록 항목은 옛 RPC와 같은 형태에 kind만 더했다.
  perform t.eq('entry shape matches old rpc',
    (select jsonb_agg(i.v - 'kind' order by i.n)
     from jsonb_array_elements(public.get_social_feed_items(0, 50)) with ordinality as i(v, n)
     where i.v ->> 'kind' = 'entry'),
    public.get_social_feed(0, 50));

  -- limit과 page의 범위는 옛 RPC와 같다.
  perform t.eq('limit floor', to_jsonb(jsonb_array_length(public.get_social_feed_items(0, 0))), '1');
  perform t.eq('limit null falls back', to_jsonb(jsonb_array_length(public.get_social_feed_items(null, null))), '10');
  perform t.eq('negative page is first page', public.get_social_feed_items(-3, 2), public.get_social_feed_items(0, 2));
  perform t.eq('past the end', public.get_social_feed_items(1000, 10), '[]');
end $$;
reset role;

-- limit 상한은 행이 더 있어야 보인다. 50건을 넘겨 확인하고 지운다.
insert into public.entries(id, user_book_id, date, quote, is_private, created_at)
select ('00000000-0000-4000-8001-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000021', '2020-01-01', '채움', false, '2020-01-01 00:00+09'
from generate_series(1, 60) n;
set role authenticated;
do $$
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('limit ceiling', to_jsonb(jsonb_array_length(public.get_social_feed_items(0, 1000))), '50');
end $$;
reset role;
delete from public.entries where id::text like '00000000-0000-4000-8001-%';

-- ── 같은 시각: id로 갈라 경계에서 흔들리지 않는다 ──────────
update public.monthly_excerpts set first_shared_at = '2026-04-08 10:00+09'
  where user_id = '00000000-0000-4000-8000-000000000001' and month = '2026-02-01';
update public.entries set created_at = '2026-04-08 10:00+09'
  where id = '00000000-0000-4000-8000-000000000203';
set role authenticated;
do $$
declare
  v_full jsonb;
  v_size int;
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  v_full := t.walk(50);
  perform t.eq('ties keep every item', to_jsonb(jsonb_array_length(v_full)), '12');
  -- 같은 시각의 세 항목(기록 둘, 발췌집 하나)은 종류와 상관없이 id 내림차순이다.
  perform t.eq('ties ordered by id desc',
    (select jsonb_agg(coalesce(i.v -> 'entry' ->> 'id', i.v ->> 'id') order by i.n)
     from jsonb_array_elements(public.get_social_feed_items(0, 50)) with ordinality as i(v, n)
     where coalesce(i.v -> 'entry' ->> 'created_at', i.v ->> 'sharedAt')::timestamptz = '2026-04-08 10:00+09'),
    (select jsonb_agg(u.id order by u.id::uuid desc) from (values
      ('00000000-0000-4000-8000-000000000202'),
      ('00000000-0000-4000-8000-000000000203'),
      (t.excerpt_id('00000000-0000-4000-8000-000000000001', '2026-02-01')::text)
    ) as u(id)));
  foreach v_size in array array[1, 2, 3, 4] loop
    perform t.eq('tie walk ' || v_size, t.walk(v_size), v_full);
  end loop;
end $$;
reset role;
update public.monthly_excerpts set first_shared_at = '2026-04-07 10:00+09'
  where user_id = '00000000-0000-4000-8000-000000000001' and month = '2026-02-01';
update public.entries set created_at = '2026-04-06 10:00+09'
  where id = '00000000-0000-4000-8000-000000000203';

-- ── 고치고 다시 공개해도 1건, 위치 그대로 ──────────────────
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  c uuid := '00000000-0000-4000-8000-000000000003';
  v_before jsonb;
  v_id uuid := t.excerpt_id(a, '2026-03-01');
begin
  perform t.as_user(c);
  v_before := t.walk(50);

  -- 고친다: 순서를 바꾸고 다시 저장. 표지만 바뀌고 자리는 같다.
  perform t.as_user(a);
  perform public.save_monthly_excerpt('2026-03', array[
    '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000103'
  ]::uuid[], true);
  perform t.as_user(c);
  perform t.eq('edit keeps position', t.walk(50), v_before);
  perform t.eq('edit moves cover', t.card('2026-03', '1') -> 'coverQuote', '"공개 문장 나"');

  -- 나만 보기로 돌리면 사라진다.
  perform t.as_user(a);
  perform public.set_monthly_excerpt_shared(v_id, false);
  perform t.as_user(c);
  if t.walk(50) ? 'X:2026-03:1' then raise exception 'unshared excerpt in feed'; end if;

  -- 다시 공개해도 처음 시각의 자리, 1건이다.
  perform t.as_user(a);
  perform public.set_monthly_excerpt_shared(v_id, true);
  perform t.as_user(c);
  perform t.eq('reshare keeps position', t.walk(50), v_before);
end $$;
reset role;

-- ── 표지가 비공개로 바뀌면 다음 공개 문장이 표지 ───────────
update public.entries set is_private = true where id = '00000000-0000-4000-8000-000000000104';
set role authenticated;
do $$
declare
  v_card jsonb;
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  v_card := t.card('2026-03', '1');
  perform t.eq('next public quote is cover', v_card -> 'coverQuote', '"공개 문장 가"');
  perform t.eq('quote count drops', v_card -> 'quoteCount', '2');
  perform t.eq('book count keeps two', v_card -> 'bookCount', '2');
end $$;
reset role;
update public.entries set is_private = false where id = '00000000-0000-4000-8000-000000000104';

-- 공개 문장이 모두 사라지면 피드에서 빠지고, 돌아오면 처음 자리로 돌아온다.
update public.entries set is_private = true
  where id in ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000105');
set role authenticated;
do $$
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  if t.walk(50) ? 'X:2026-03:1' then raise exception 'no public quote must hide excerpt'; end if;
end $$;
reset role;
update public.entries set is_private = false
  where id in ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000105');

-- ── 좋아요·댓글 수와 내 좋아요 ─────────────────────────────
set role authenticated;
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  c uuid := '00000000-0000-4000-8000-000000000003';
  v_id uuid := t.excerpt_id(a, '2026-03-01');
  v_card jsonb;
begin
  perform t.as_user(c);
  v_card := t.card('2026-03', '1');
  perform t.eq('no reactions yet',
    jsonb_build_array(v_card -> 'initialLiked', v_card -> 'initialLikeCount', v_card -> 'initialCommentCount'),
    '[false, 0, 0]');
  perform t.eq('id is the excerpt', v_card -> 'id', to_jsonb(v_id));

  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (c, v_id);
  insert into public.monthly_excerpt_comments(excerpt_id, user_id, content) values (v_id, c, '좋아요');

  perform t.as_user(a);
  insert into public.monthly_excerpt_likes(user_id, excerpt_id) values (a, v_id);

  perform t.as_user(c);
  v_card := t.card('2026-03', '1');
  perform t.eq('my reactions and counts',
    jsonb_build_array(v_card -> 'initialLiked', v_card -> 'initialLikeCount', v_card -> 'initialCommentCount'),
    '[true, 2, 1]');
end $$;

-- ── 보면 안 되는 사람 ───────────────────────────────────────
do $$
declare
  a uuid := '00000000-0000-4000-8000-000000000001';
  d uuid := '00000000-0000-4000-8000-000000000004';
  e uuid := '00000000-0000-4000-8000-000000000005';
begin
  -- 친구 아님, 신청만 한 사이: 피드도 도우미도 비었다.
  perform t.as_user(d);
  perform t.eq('stranger feed empty', public.get_social_feed_items(0, 50), '[]');
  perform t.eq('stranger helper empty', to_jsonb((select count(*) from public.friend_feed_monthly_excerpts(50))), '0');
  perform t.as_user(e);
  perform t.eq('pending feed empty', public.get_social_feed_items(0, 50), '[]');
  perform t.eq('pending helper empty', to_jsonb((select count(*) from public.friend_feed_monthly_excerpts(50))), '0');

  -- 내 발췌집은 내 피드에 없다(내 기록도 없다). A의 친구 C는 쓴 것이 없어 비었다.
  perform t.as_user(a);
  perform t.eq('own feed has no own excerpt', public.get_social_feed_items(0, 50), '[]');
  perform t.eq('own helper has no own excerpt', to_jsonb((select count(*) from public.friend_feed_monthly_excerpts(50))), '0');

  -- 도우미의 음수·null 인자는 빈 결과다.
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('helper negative limit', to_jsonb((select count(*) from public.friend_feed_monthly_excerpts(-1))), '0');
  perform t.eq('helper null limit', to_jsonb((select count(*) from public.friend_feed_monthly_excerpts(null))), '0');
  -- 세션 없는 호출도 비었다.
  perform set_config('request.jwt.claims', '', false);
  perform t.eq('no session', public.get_social_feed_items(0, 50), '[]');
end $$;
reset role;

-- 친구를 끊으면 그 사람의 소식이 사라진다. B의 소식만 남는다.
delete from public.friends
  where user_id = '00000000-0000-4000-8000-000000000001' and friend_id = '00000000-0000-4000-8000-000000000003';
set role authenticated;
do $$
begin
  perform t.as_user('00000000-0000-4000-8000-000000000003');
  perform t.eq('unfriended leaves only other friend', t.walk(50), '["사월 육일","X:2026-03:2","비 삼월"]');
end $$;
reset role;
