insert into auth.users values('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.profiles(id,name,nickname,tag) select id,'Reader','Reader',id::text from auth.users;
insert into public.books(id,title) values('10000000-0000-0000-0000-000000000001','Test');
insert into public.user_books(id,user_id,book_id) values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001"}',false);
set role authenticated;
select public.save_push_preferences(true,array['reminder','finished'],'Asia/Seoul',20,array[0,1,2,3,4,5,6]);
select public.save_push_subscription('https://fcm.googleapis.com/test',repeat('A',87),repeat('B',22));
do $$begin
 if has_function_privilege('authenticated','public.claim_push_batch(integer)','execute') then raise exception 'public sender';end if;
 if has_function_privilege('anon','public.save_push_preferences(boolean,text[],text,integer,integer[])','execute') then raise exception 'anonymous preference write';end if;
 if has_table_privilege('authenticated','public.push_deliveries','insert') then raise exception 'delivery spoofing';end if;
end$$;
reset role;
update public.push_preferences set consent_at=now()-interval '4 days',seen_at=now()-interval '4 days';
do $$begin
 if not public.push_candidates('00000000-0000-0000-0000-000000000001',now()) @> '[{"kind":"reminder"}]' then raise exception '3 day reminder missing';end if;
 if public.push_candidates('00000000-0000-0000-0000-000000000001',now()-interval '2 days') <> '[]' then raise exception 'early reminder';end if;
end$$;
-- Choose a real time zone where it is daytime now, so claim's production clock need not be injectable.
update public.push_preferences set timezone=(select name from pg_timezone_names where extract(hour from now() at time zone name)=12 limit 1),hour=12;
set role service_role;
select * from public.claim_push_batch(5);
do $$declare n integer;begin select count(*) into n from public.push_deliveries;if n<>1 then raise exception 'claim failed: %',n;end if;
 select count(*) into n from public.claim_push_batch(5);if n<>0 then raise exception 'duplicate claim';end if;
 if public.authorize_push_delivery((select id from public.push_deliveries limit 1)) is null then raise exception 'authorize failed';end if;
end$$;
reset role;
-- Record just written suppresses an already claimed reminder.
insert into public.entries(user_book_id,date,note) values('20000000-0000-0000-0000-000000000001',current_date,'New note');
do $$begin if public.authorize_push_delivery((select id from public.push_deliveries limit 1)) is not null then raise exception 'stale reminder';end if;end$$;
-- Other account cannot read subscriptions or deliveries, or steal a known endpoint.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002"}',false);
set role authenticated;
do $$begin if exists(select 1 from public.push_subscriptions) or exists(select 1 from public.push_deliveries) then raise exception 'cross user read';end if;end$$;
select public.save_push_preferences(true,array['reminder'],'Asia/Seoul',20,array[0]);
do $$begin
 begin perform public.save_push_subscription('https://fcm.googleapis.com/test',repeat('A',87),repeat('B',22));raise exception 'stole endpoint';exception when raise_exception then if sqlerrm='stole endpoint' then raise;end if;end;
end$$;
reset role;
-- Revocation deletes subscriptions and prevents queued delivery.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001"}',false);
set role authenticated;
select public.save_push_preferences(false,array['reminder'],'Asia/Seoul',20,array[0]);
reset role;
do $$begin if exists(select 1 from public.push_subscriptions) then raise exception 'optout retained subscriptions';end if;end$$;
-- Finished book is eligible after 7 days, but not if note was written after finishing.
update public.push_preferences set enabled=true,kinds=array['finished'],consent_at=now()-interval '20 days' where user_id='00000000-0000-0000-0000-000000000001';
update public.user_books set is_finished=true,finished_at=now()-interval '8 days';
do $$begin if public.push_candidates('00000000-0000-0000-0000-000000000001',now())<>'[]' then raise exception 'already reflected';end if;end$$;
delete from public.entries;
do $$begin if not public.push_candidates('00000000-0000-0000-0000-000000000001',now()) @> '[{"kind":"finished"}]' then raise exception 'finished reminder missing';end if;end$$;
insert into public.push_finished_receipts values('00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
do $$begin if public.push_candidates('00000000-0000-0000-0000-000000000001',now())<>'[]' then raise exception 'finished duplicate';end if;end$$;

-- Whole-account rolling cap: 48h blocks, then 2 claims in any 7 days blocks.
update public.user_books set is_finished=false;
update public.push_preferences set kinds=array['reminder'],consent_at=now()-interval '30 days',seen_at=now() where user_id='00000000-0000-0000-0000-000000000001';
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values('00000000-0000-0000-0000-000000000001','https://fcm.googleapis.com/test',repeat('A',87),repeat('B',22));
delete from public.push_deliveries;
insert into public.push_deliveries(user_id,items,created_at) values('00000000-0000-0000-0000-000000000001','[{"kind":"recall"}]',now()-interval '47 hours');
do $$begin if exists(select 1 from public.claim_push_batch(5)) then raise exception '48h cap';end if;end$$;
update public.push_deliveries set created_at=now()-interval '49 hours';
insert into public.push_deliveries(user_id,items,created_at) values('00000000-0000-0000-0000-000000000001','[{"kind":"weekly"}]',now()-interval '5 days');
do $$begin if exists(select 1 from public.claim_push_batch(5)) then raise exception 'weekly cap';end if;end$$;
delete from public.push_deliveries;
-- Friends: only accepted, nonprivate, unseen activity; one summary item, never one per record.
update public.push_preferences set kinds=array['friends','weekly','recall'],timezone='UTC',consent_at=now()-interval '60 days' where user_id='00000000-0000-0000-0000-000000000001';
insert into public.user_books(id,user_id,book_id) values('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
insert into public.friends(user_id,friend_id,status) values('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','accepted');
insert into public.entries(user_book_id,date,quote,is_private) values('20000000-0000-0000-0000-000000000002',current_date,'Friend',true);
do $$declare w timestamptz;begin
 w=date_trunc('day',now())+((3-extract(dow from now())::int+7)%7)*interval '1 day'+interval '20 hours';
 if public.push_candidates('00000000-0000-0000-0000-000000000001',w) @> '[{"kind":"friends"}]' then raise exception 'private friend record';end if;
 update public.entries set is_private=false;
 if not public.push_candidates('00000000-0000-0000-0000-000000000001',w) @> '[{"kind":"friends"}]' then raise exception 'friend digest missing';end if;
 update public.friends set status='pending';
 if public.push_candidates('00000000-0000-0000-0000-000000000001',w) @> '[{"kind":"friends"}]' then raise exception 'pending friend leak';end if;
 update public.friends set status='accepted';
 insert into public.push_seen(user_id,kind,seen_at) values('00000000-0000-0000-0000-000000000001','friends',w);
 if public.push_candidates('00000000-0000-0000-0000-000000000001',w) @> '[{"kind":"friends"}]' then raise exception 'already seen digest';end if;
end$$;
insert into public.entries(user_book_id,date,quote,created_at) values('20000000-0000-0000-0000-000000000001',current_date,'Old quote',now()-interval '40 days');
do $$begin if not public.push_candidates('00000000-0000-0000-0000-000000000001',now()) @> '[{"kind":"recall"}]' then raise exception 'recall missing';end if;end$$;
insert into public.push_seen(user_id,kind) values('00000000-0000-0000-0000-000000000001','recall');
do $$begin if public.push_candidates('00000000-0000-0000-0000-000000000001',now()) @> '[{"kind":"recall"}]' then raise exception 'seen recall';end if;end$$;
insert into public.entries(user_book_id,date,note) values('20000000-0000-0000-0000-000000000001',current_date,'This week');
do $$declare sunday timestamptz;begin
 sunday=date_trunc('day',now())+((7-extract(dow from now())::int)%7)*interval '1 day'+interval '20 hours';
 if not public.push_candidates('00000000-0000-0000-0000-000000000001',sunday) @> '[{"kind":"weekly"}]' then raise exception 'weekly missing';end if;
end$$;

delete from auth.users where id='00000000-0000-0000-0000-000000000001';
do $$begin if exists(select 1 from public.push_deliveries) or exists(select 1 from public.push_finished_receipts) then raise exception 'account cascade';end if;end$$;
