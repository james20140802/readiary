-- 사진 글자 읽기 동의와 하루 한도 계약. 메모리 안의 격리된 DB에서만 실행하고, 실패는 raise exception으로 알린다.
-- A(…001)와 B(…002) 두 계정. 자료는 소유자 권한으로 넣고, RPC는 jwt claims로 사람을 바꿔 부른다.

create schema t;
grant usage on schema t to authenticated, anon;

create function t.id(p_n int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(p_n::text, 12, '0'))::uuid;
$$;

create function t.as_user(p_n int) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', t.id(p_n), 'role', 'authenticated')::text, false);
$$;

create function t.eq(p_label text, p_got text, p_want text) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception '%: got % want %', p_label, p_got, p_want;
  end if;
end;
$$;

-- p_sql이 p_message를 담은 오류로 실패해야 한다.
create function t.fails(p_label text, p_sql text, p_message text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not like '%' || p_message || '%' then
      raise exception '%: failed with "%", want "%"', p_label, sqlerrm, p_message;
    end if;
    return;
  end;
  raise exception '%: should have failed', p_label;
end;
$$;

insert into auth.users(id) values (t.id(1)), (t.id(2));

-- ── 동의 전에는 읽을 수 없다 ─────────────────────────────────
select t.as_user(1);
select t.eq('동의 전 읽기', public.begin_photo_text_read(1), 'consent_required');
select t.eq('동의 전 상태', public.photo_text_consented(1)::text, 'false');
select t.eq('동의 전에는 횟수를 쓰지 않는다', (select count(*)::text from public.photo_text_usage), '0');

-- ── 동의하면 하루 30장까지 ──────────────────────────────────
select public.set_photo_text_consent(1);
select t.eq('동의 뒤 상태', public.photo_text_consented(1)::text, 'true');
select t.eq('문구 판이 바뀌면 다시 묻는다', public.photo_text_consented(2)::text, 'false');
select t.eq('다른 판으로는 읽지 못한다', public.begin_photo_text_read(2), 'consent_required');

do $$
declare i int;
begin
  for i in 1..30 loop
    perform t.eq('읽기 ' || i, public.begin_photo_text_read(1), 'ok');
  end loop;
end $$;
select t.eq('31번째', public.begin_photo_text_read(1), 'daily_limit');
select t.eq('한도를 넘겨 세지 않는다', (select count::text from public.photo_text_usage where user_id = t.id(1)), '30');

-- B의 한도는 따로다.
select t.as_user(2);
select public.set_photo_text_consent(1);
select t.eq('B의 첫 읽기', public.begin_photo_text_read(1), 'ok');

-- ── 한국 시간으로 날이 바뀌면 다시 쓸 수 있고 지난 줄은 지운다 ──
update public.photo_text_usage set day = day - 1 where user_id = t.id(1);
select t.as_user(1);
select t.eq('다음 날', public.begin_photo_text_read(1), 'ok');
select t.eq('지난 날의 줄은 남기지 않는다', (select count(*)::text from public.photo_text_usage where user_id = t.id(1)), '1');
select t.eq('오늘은 한국 날짜', (select day::text from public.photo_text_usage where user_id = t.id(1)),
  ((now() at time zone 'Asia/Seoul')::date)::text);
select t.eq('B의 줄은 건드리지 않는다', (select count(*)::text from public.photo_text_usage where user_id = t.id(2)), '1');

-- ── 철회하면 바로 막힌다. 다시 동의하면 열린다 ────────────────
select public.withdraw_photo_text_consent();
select t.eq('철회 뒤 상태', public.photo_text_consented(1)::text, 'false');
select t.eq('철회 뒤 읽기', public.begin_photo_text_read(1), 'consent_required');
select t.eq('철회 시각을 남긴다', (select (withdrawn_at is not null)::text from public.photo_text_consents where user_id = t.id(1)), 'true');
select public.set_photo_text_consent(1);
select t.eq('다시 동의', public.begin_photo_text_read(1), 'ok');
select t.eq('다시 동의하면 철회 시각을 지운다', (select (withdrawn_at is null)::text from public.photo_text_consents where user_id = t.id(1)), 'true');
select t.fails('없는 판 번호', 'select public.set_photo_text_consent(0)', 'invalid_version');

-- ── 클라이언트 역할: 본인 동의만 읽고, 직접 쓰지 못한다 ───────
set role authenticated;
select t.as_user(1);
select t.eq('본인 동의만 보인다', (select count(*)::text from public.photo_text_consents), '1');
select t.eq('보이는 줄은 본인 것', (select user_id::text from public.photo_text_consents), t.id(1)::text);
select t.fails('동의 직접 쓰기', 'insert into public.photo_text_consents(user_id, copy_version, consented_at) values (t.id(1), 1, now())', 'permission denied');
select t.fails('동의 직접 고치기', 'update public.photo_text_consents set withdrawn_at = null', 'permission denied');
select t.fails('동의 직접 지우기', 'delete from public.photo_text_consents', 'permission denied');
select t.fails('횟수 읽기', 'select * from public.photo_text_usage', 'permission denied');
select t.fails('횟수 되돌리기', 'delete from public.photo_text_usage', 'permission denied');
select t.eq('RPC는 쓸 수 있다', public.begin_photo_text_read(1), 'ok');
reset role;

set role anon;
select set_config('request.jwt.claims', '', false);
select t.fails('anon 읽기', 'select public.begin_photo_text_read(1)', 'permission denied');
select t.fails('anon 동의', 'select public.set_photo_text_consent(1)', 'permission denied');
select t.fails('anon 철회', 'select public.withdraw_photo_text_consent()', 'permission denied');
select t.fails('anon 상태', 'select public.photo_text_consented(1)', 'permission denied');
select t.fails('anon 테이블', 'select * from public.photo_text_consents', 'permission denied');
reset role;

-- 로그인 없이 부르면(claims 없음) 아무것도 쓰지 않는다.
select t.eq('로그인 없음', public.begin_photo_text_read(1), 'consent_required');

-- ── 계정을 지우면 함께 지워진다 ──────────────────────────────
delete from auth.users where id = t.id(1);
select t.eq('동의 삭제', (select count(*)::text from public.photo_text_consents where user_id = t.id(1)), '0');
select t.eq('횟수 삭제', (select count(*)::text from public.photo_text_usage where user_id = t.id(1)), '0');
