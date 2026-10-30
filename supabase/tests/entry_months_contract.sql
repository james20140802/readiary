-- Only executed in the isolated in-memory fixture schema.
insert into auth.users(id) values
('00000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000002');
insert into public.profiles(id,name,nickname,tag) select id,'Test',id::text,'0001' from auth.users;
insert into public.books(id,title) values ('00000000-0000-4000-8000-000000000010','Book');
insert into public.user_books(id,user_id,book_id) values
('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010'),
('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000010');
-- 기록 날짜(date) 기준으로 센다: 작성 시각이 다음 달이어도 9월 30일 기록은 9월이다
insert into public.entries(user_book_id,date,note,is_private,created_at) values
('00000000-0000-4000-8000-000000000011','2026-08-10','a',true,'2026-08-10'),
('00000000-0000-4000-8000-000000000011','2026-08-31','b',false,'2026-08-31'),
('00000000-0000-4000-8000-000000000011','2026-09-30','c',true,'2026-10-01 02:00+09'),
('00000000-0000-4000-8000-000000000011','2025-12-01','d',false,'2025-12-01'),
('00000000-0000-4000-8000-000000000012','2026-10-05','other',false,'2026-10-05');

do $$ begin
  if has_function_privilege('anon', 'public.get_entry_months()', 'execute') then
    raise exception 'anon must not execute get_entry_months';
  end if;
  if not has_function_privilege('authenticated', 'public.get_entry_months()', 'execute') then
    raise exception 'authenticated must execute get_entry_months';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',false);
do $$ declare got text; begin
  select string_agg(month || ':' || entry_count, ',' order by ord) into got
  from (select *, row_number() over () as ord from public.get_entry_months()) m;
  if got is distinct from '2026-09:1,2026-08:2,2025-12:1' then
    raise exception 'unexpected months for owner: %', got;
  end if;
end $$;

select set_config('request.jwt.claims','',false);
do $$ begin
  begin
    perform public.get_entry_months();
    raise exception 'anonymous call must fail';
  exception when others then
    if sqlerrm <> 'Authentication required' then raise; end if;
  end;
end $$;
reset role;
