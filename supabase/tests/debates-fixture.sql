-- 문장 토론 계약의 공통 준비. run-debates-contract.mjs가 debates_*_contract.sql마다 앞에 붙여 새 DB에서 실행한다.
--
-- 역할: A(…001) 발제자. B(…002)·F(…006)·P(…007)는 A의 친구이고 서로는 친구가 아니다.
--       C(…003)는 누구와도 친구가 아니다. P는 탈퇴 유예를 시험할 때 쓴다(처음에는 활성).

create schema t;
grant usage on schema t to authenticated, anon;

create function t.id(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

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

-- 문장을 실행해 ok, 앱 예외 이름(raise exception의 메시지), 또는 sqlstate를 돌려준다.
create function t.err(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  if sqlstate = 'P0001' then return sqlerrm; end if;
  return sqlstate;
end;
$$;

-- RLS를 무시한 실제 행 수.
create function t.real_count(p_table text, p_where text default 'true') returns int
language plpgsql security definer as $$
declare n int;
begin
  execute format('select count(*)::int from public.%I where %s', p_table, p_where) into n;
  return n;
end;
$$;

-- 지금 역할이 보는 행 수(RLS 적용).
create function t.seen_count(p_table text, p_where text default 'true') returns int
language plpgsql as $$
declare n int;
begin
  execute format('select count(*)::int from public.%I where %s', p_table, p_where) into n;
  return n;
end;
$$;

grant execute on all functions in schema t to authenticated, anon;

insert into auth.users(id) select t.id(n) from unnest(array[1, 2, 3, 6, 7]) n;
insert into public.profiles(id, name, nickname, tag)
  select id, 'Test', 'u' || right(id::text, 1), '0001' from auth.users;
insert into public.books(id, title, author) values
  (t.id(10), '에로스의 종말', '한병철'),
  (t.id(20), '소유냐 존재냐', '에리히 프롬');
insert into public.user_books(id, user_id, book_id) values
  (t.id(11), t.id(1), t.id(10)),
  (t.id(21), t.id(2), t.id(20));
insert into public.friends(user_id, friend_id, status, accepted_at) values
  (t.id(1), t.id(2), 'accepted', now()),
  (t.id(6), t.id(1), 'accepted', now()),
  (t.id(1), t.id(7), 'accepted', now());
insert into public.entries(id, user_book_id, date, quote, note, from_page, to_page, is_private) values
  (t.id(101), t.id(11), '2026-11-01', '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.', 'A의 생각', 42, null, false),
  (t.id(102), t.id(11), '2026-11-02', null, '생각만 있는 기록', null, null, false),
  (t.id(103), t.id(11), '2026-11-03', '🙂 가나다', null, null, null, true),
  (t.id(201), t.id(21), '2026-11-04', '사랑은 가지는 것이 아니라 하는 것이다.', 'B의 비밀 생각', 96, 97, true),
  (t.id(202), t.id(21), '2026-11-05', null, 'B의 생각만', null, null, false);
