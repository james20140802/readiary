-- Run against a database with both PR 91 migrations applied. Every fixture is rolled back.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '15s';

insert into auth.users(id) values
('00000000-0000-4000-8000-000000000091'), ('00000000-0000-4000-8000-000000000092');
insert into public.profiles(id, name, nickname, tag, profile_image) values
('00000000-0000-4000-8000-000000000091', 'PR91 test', 'pr91fixturea', '9191', '00000000-0000-4000-8000-000000000091/current.png'),
('00000000-0000-4000-8000-000000000092', 'PR91 test', 'pr91fixtureb', '9191', null);
insert into public.books(id, title) values ('00000000-0000-4000-8000-000000000093', 'PR91 fixture');
insert into public.user_books(id, user_id, book_id) values
('00000000-0000-4000-8000-000000000094', '00000000-0000-4000-8000-000000000091', '00000000-0000-4000-8000-000000000093');
insert into public.entries(id, user_book_id, date, quote, is_private) values
('00000000-0000-4000-8000-000000000095', '00000000-0000-4000-8000-000000000094', '2026-09-06', 'PR91 fixture', false);
insert into public.friends(user_id, friend_id, status) values
('00000000-0000-4000-8000-000000000091', '00000000-0000-4000-8000-000000000092', 'accepted');
insert into storage.objects(bucket_id, name) values
('profiles', '00000000-0000-4000-8000-000000000091/current.png'),
('profiles', '00000000-0000-4000-8000-000000000091/abandoned.png');

do $$ begin
  if (select public from storage.buckets where id='profiles') then raise exception 'Avatar bucket is public'; end if;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if exists(select 1 from public.get_public_entry('00000000-0000-4000-8000-000000000095')) then
    raise exception 'Unshared entry leaked';
  end if;
  begin
    if exists(select 1 from storage.objects where bucket_id='profiles') then raise exception 'Anonymous avatar access'; end if;
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000092"}', true);
do $$ declare affected int; begin
  if not exists(select 1 from storage.objects where name='00000000-0000-4000-8000-000000000091/current.png') then raise exception 'Published avatar unavailable to member'; end if;
  if exists(select 1 from storage.objects where name='00000000-0000-4000-8000-000000000091/abandoned.png') then raise exception 'Abandoned avatar leaked to member'; end if;
  if public.enable_entry_share('00000000-0000-4000-8000-000000000095') then raise exception 'Friend enabled owner share'; end if;
  update storage.objects set metadata='{}'::jsonb where name='00000000-0000-4000-8000-000000000091/current.png';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Member changed another avatar'; end if;
  delete from storage.objects where name='00000000-0000-4000-8000-000000000091/current.png';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Member deleted another avatar'; end if;
  begin
    insert into storage.objects(bucket_id,name) values('profiles','00000000-0000-4000-8000-000000000091/injected.png');
    raise exception 'Member uploaded into another folder';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set profile_image='00000000-0000-4000-8000-000000000091/current.png' where id='00000000-0000-4000-8000-000000000092';
    raise exception 'Member attached another avatar';
  exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000091"}', true);
do $$ begin
  if not exists(select 1 from storage.objects where name='00000000-0000-4000-8000-000000000091/abandoned.png') then raise exception 'Owner cannot clean abandoned image'; end if;
  insert into storage.objects(bucket_id,name) values('profiles','00000000-0000-4000-8000-000000000091/new.png');
  delete from storage.objects where name='00000000-0000-4000-8000-000000000091/new.png';
  if exists(select 1 from storage.objects where name='00000000-0000-4000-8000-000000000091/new.png') then raise exception 'Owner cannot delete own image'; end if;
  if not public.enable_entry_share('00000000-0000-4000-8000-000000000095') then raise exception 'Owner cannot enable share'; end if;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if not exists(select 1 from public.get_public_entry('00000000-0000-4000-8000-000000000095')) then raise exception 'Explicit share unavailable'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000091"}', true);
update public.entries set is_private=true where id='00000000-0000-4000-8000-000000000095';
do $$ begin
  if public.enable_entry_share('00000000-0000-4000-8000-000000000095') then raise exception 'Private entry became shareable'; end if;
end $$;
update public.entries set is_private=false where id='00000000-0000-4000-8000-000000000095';
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if exists(select 1 from public.get_public_entry('00000000-0000-4000-8000-000000000095')) then raise exception 'Old share silently revived'; end if;
end $$;
reset role;
rollback;
select 'privacy contract passed; fixtures rolled back' as result;
