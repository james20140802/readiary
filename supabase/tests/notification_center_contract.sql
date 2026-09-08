insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.profiles(id,name,nickname,tag) select id,'Reader','Reader',id::text from auth.users;
insert into public.push_preferences(user_id,enabled,kinds) select id,true,array['reminder'] from auth.users;
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values('00000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/test',repeat('A',87),repeat('B',22));
do $$ begin
 if has_function_privilege('authenticated','public.claim_push_test(uuid,text)','execute') or has_function_privilege('anon','public.claim_push_test(uuid,text)','execute') then raise exception 'public test sender'; end if;
 if has_function_privilege('anon','public.has_unread_notifications()','execute') then raise exception 'anonymous badge'; end if;
end $$;
set role service_role;
do $$ begin
 if public.claim_push_test('00000000-0000-0000-0000-000000000002','https://fcm.googleapis.com/test') is not null then raise exception 'cross-user send'; end if;
 if public.claim_push_test('00000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/test') is null then raise exception 'valid test blocked'; end if;
 if public.claim_push_test('00000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/test') is not null then raise exception 'duplicate test'; end if;
 if exists(select 1 from public.push_deliveries) then raise exception 'test consumes production quota'; end if;
end $$;
reset role;
update public.push_preferences set last_test_at=now()-interval '2 minutes',enabled=false;
set role service_role;
do $$ begin
 if public.claim_push_test('00000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/test') is not null then raise exception 'no consent'; end if;
end $$;
reset role;
update public.push_preferences set enabled=true;
set role service_role;
do $$ begin
 if public.claim_push_test('00000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/test') is null then raise exception 'cooldown never ends'; end if;
end $$;
reset role;
insert into public.push_deliveries(user_id,items,status) values('00000000-0000-0000-0000-000000000001','[]','sent');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002"}',false);
set role authenticated;
do $$ begin if public.has_unread_notifications() then raise exception 'other user badge'; end if; end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001"}',false);
set role authenticated;
do $$ begin if not public.has_unread_notifications() then raise exception 'push missing from badge'; end if; end $$;
select public.mark_push_seen('inbox',(select id from public.push_deliveries limit 1));
do $$ begin if public.has_unread_notifications() then raise exception 'read badge stuck'; end if; end $$;
reset role;
-- Opt-out preserves delivery history, but must still allow clearing its badge.
update public.push_preferences set enabled=false;
update public.push_deliveries set opened_at=null;
select set_config('test.foreign_delivery_id',(select id::text from public.push_deliveries limit 1),false);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002"}',false);
set role authenticated;
select public.mark_push_seen('inbox',current_setting('test.foreign_delivery_id')::uuid);
reset role;
do $$ begin if exists(select 1 from public.push_deliveries where opened_at is not null) then raise exception 'cross-user read'; end if; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001"}',false);
set role authenticated;
do $$ begin if not public.has_unread_notifications() then raise exception 'opt-out history missing'; end if; end $$;
select public.mark_push_seen('weekly',current_setting('test.foreign_delivery_id')::uuid);
do $$ begin if public.has_unread_notifications() then raise exception 'opt-out badge stuck'; end if; end $$;
reset role;
do $$ begin if exists(select 1 from public.push_seen) then raise exception 'opt-out tracked activity'; end if; end $$;
insert into public.notifications(user_id,actor_id,type) values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','friend_request');
set role authenticated;
do $$ begin if not public.has_unread_notifications() then raise exception 'social badge missing'; end if; end $$;
reset role;
