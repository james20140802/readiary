-- Additive, opt-in only. No existing account is subscribed by this migration.
create table public.push_preferences (
 user_id uuid primary key references auth.users on delete cascade,
 enabled boolean not null default false,
 kinds text[] not null default '{}',
 timezone text not null default 'Asia/Seoul',
 hour integer not null default 20 check(hour between 9 and 21),
 weekdays integer[] not null default '{0,1,2,3,4,5,6}' check(cardinality(weekdays) between 1 and 7 and weekdays <@ array[0,1,2,3,4,5,6]),
 consent_at timestamptz not null default now(),
 seen_at timestamptz not null default now(),
 check(kinds <@ array['reminder','finished','weekly','recall','friends']::text[])
);
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 endpoint text unique not null check(length(endpoint) <= 2048),
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
-- Claims count towards the cap even if delivery becomes ambiguous. Never retry a sent request.
create table public.push_deliveries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 items jsonb not null,
 created_at timestamptz not null default now(),
 status text not null default 'claimed' check(status in ('claimed','sent','failed','cancelled')),
 opened_at timestamptz
);
create index push_deliveries_user_time_idx on public.push_deliveries(user_id,created_at desc);
-- Permanent per-book dedup is separate from the 90-day delivery history.
create table public.push_finished_receipts (
 user_id uuid not null references auth.users on delete cascade,
 user_book_id uuid not null references public.user_books on delete cascade,
 primary key(user_id,user_book_id)
);
create table public.push_seen (
 user_id uuid not null references auth.users on delete cascade,
 kind text not null check(kind in ('friends','weekly','recall')),
 seen_at timestamptz not null default now(),
 primary key(user_id,kind)
);

alter table public.push_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_deliveries enable row level security;
alter table public.push_finished_receipts enable row level security;
alter table public.push_seen enable row level security;
revoke all on public.push_preferences,public.push_subscriptions,public.push_deliveries,public.push_finished_receipts,public.push_seen from public,anon,authenticated;
grant all on public.push_preferences,public.push_subscriptions,public.push_deliveries,public.push_finished_receipts,public.push_seen to service_role;
grant select on public.push_preferences,public.push_subscriptions,public.push_deliveries to authenticated;
grant delete on public.push_subscriptions to authenticated;
create policy own_preferences on public.push_preferences for select to authenticated using(user_id=(select auth.uid()));
create policy own_subscriptions on public.push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy delete_subscriptions on public.push_subscriptions for delete to authenticated using(user_id=(select auth.uid()));
create policy own_deliveries on public.push_deliveries for select to authenticated using(user_id=(select auth.uid()));

create function public.save_push_preferences(p_enabled boolean,p_kinds text[],p_timezone text,p_hour integer,p_weekdays integer[])
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'invalid timezone'; end if;
 insert into public.push_preferences(user_id,enabled,kinds,timezone,hour,weekdays)
 values(auth.uid(),p_enabled,p_kinds,p_timezone,p_hour,p_weekdays)
 on conflict(user_id) do update set enabled=excluded.enabled,kinds=excluded.kinds,timezone=excluded.timezone,hour=excluded.hour,weekdays=excluded.weekdays,
 consent_at=case when not push_preferences.enabled and excluded.enabled then now() else push_preferences.consent_at end;
 if not p_enabled then
  delete from public.push_subscriptions where user_id=auth.uid();
  update public.push_deliveries set status='cancelled' where user_id=auth.uid() and status='claimed';
 end if;
end $$;
create function public.save_push_subscription(p_endpoint text,p_p256dh text,p_auth text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if not exists(select 1 from public.push_preferences where user_id=auth.uid() and enabled) then raise exception 'consent required'; end if;
 if p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
 or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}=?$' or p_auth !~ '^[A-Za-z0-9_-]{22}={0,2}$' then raise exception 'invalid subscription'; end if;
 perform pg_advisory_xact_lock(hashtextextended('push-sub:'||auth.uid()::text,0));
 if (select count(*) from public.push_subscriptions where user_id=auth.uid()) >= 10 and not exists(select 1 from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid()) then raise exception 'device limit'; end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(auth.uid(),p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth
 where push_subscriptions.user_id=auth.uid();
 if not found then raise exception 'subscription already registered'; end if;
end $$;
create function public.mark_push_seen(p_kind text,p_delivery uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 if not exists(select 1 from public.push_preferences where user_id=auth.uid() and enabled) then return; end if;
 if p_kind in ('friends','weekly','recall') then
  insert into public.push_seen(user_id,kind) values(auth.uid(),p_kind) on conflict(user_id,kind) do update set seen_at=now();
 end if;
 if p_delivery is not null then update public.push_deliveries set opened_at=now() where id=p_delivery and user_id=auth.uid(); end if;
 update public.push_preferences set seen_at=now() where user_id=auth.uid();
end $$;

-- Service-only candidate selection. No user identifiers or text leave the DB beyond this user's result.
create function public.push_candidates(p_user uuid,p_now timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.push_preferences; result jsonb='[]'; last_record timestamptz; last_kind timestamptz; b record; recalled record; cutoff timestamptz; local_day integer;
begin
 select * into p from public.push_preferences where user_id=p_user and enabled;
 if not found then return result; end if;
 local_day=extract(dow from p_now at time zone p.timezone)::integer;
 select max(e.created_at) into last_record from public.entries e join public.user_books ub on ub.id=e.user_book_id where ub.user_id=p_user;
 if 'reminder'=any(p.kinds) and coalesce(last_record,p.consent_at)<=p_now-interval '3 days'
 and exists(select 1 from public.user_books where user_id=p_user and not is_finished)
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"reminder"}]')
 and (select count(*) from public.push_deliveries where user_id=p_user and created_at>greatest(coalesce(last_record,p.consent_at),p.seen_at) and items @> '[{"kind":"reminder"}]')<2 then
 result=result||jsonb_build_array(jsonb_build_object('kind','reminder','href','/protected/books','label','읽고 있는 책에 한 문장 남겨볼까요?'));
 end if;
 if 'finished'=any(p.kinds) then
 for b in select ub.id,ub.book_id from public.user_books ub where ub.user_id=p_user and ub.is_finished and ub.finished_at>=p.consent_at and ub.finished_at<=p_now-interval '7 days'
 and not exists(select 1 from public.entries e where e.user_book_id=ub.id and e.created_at>=ub.finished_at and nullif(btrim(e.note),'') is not null)
 and not exists(select 1 from public.push_finished_receipts r where r.user_id=p_user and r.user_book_id=ub.id)
 order by ub.finished_at limit 5 loop
 result=result||jsonb_build_array(jsonb_build_object('kind','finished','book',b.id,'href','/protected/books/'||b.book_id||'/entry/new','label','완독한 책의 여운을 남겨보세요'));
 end loop;
 end if;
 if 'weekly'=any(p.kinds) and local_day=0 and last_record>p_now-interval '7 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='weekly' and seen_at>p_now-interval '1 day')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"weekly"}]') then
 result=result||jsonb_build_array(jsonb_build_object('kind','weekly','href','/protected/notifications/weekly','label','이번 주에 남긴 기록을 돌아보세요'));
 end if;
 if 'recall'=any(p.kinds) and p.consent_at<=p_now-interval '14 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='recall' and seen_at>p_now-interval '14 days')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '14 days' and items @> '[{"kind":"recall"}]') then
 select ent.id into recalled from public.entries ent join public.user_books ub on ub.id=ent.user_book_id
 where ub.user_id=p_user and ent.created_at<p_now-interval '30 days' and nullif(btrim(ent.quote),'') is not null
 and not exists(select 1 from public.push_deliveries d where d.user_id=p_user and d.items @> jsonb_build_array(jsonb_build_object('entry',ent.id)))
 order by ent.created_at,ent.id limit 1;
 if found then result=result||jsonb_build_array(jsonb_build_object('kind','recall','entry',recalled.id,'href','/protected/entry/'||recalled.id,'label','예전에 남긴 문장을 다시 만나보세요')); end if;
 end if;
 if 'friends'=any(p.kinds) and local_day=3
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"friends"}]') then
 select greatest(p.consent_at,p_now-interval '7 days',coalesce((select seen_at from public.push_seen where user_id=p_user and kind='friends'),p.consent_at)) into cutoff;
 if exists(select 1 from public.entries ent join public.user_books ub on ub.id=ent.user_book_id where not ent.is_private and ent.created_at>cutoff
 and exists(select 1 from public.friends f where f.status='accepted' and ((f.user_id=p_user and f.friend_id=ub.user_id) or (f.friend_id=p_user and f.user_id=ub.user_id)))) then
 result=result||jsonb_build_array(jsonb_build_object('kind','friends','href','/protected/social','label','친구들이 새 기록을 남겼어요'));
 end if;
 end if;
 return result;
end $$;
create function public.claim_push_batch(p_limit integer default 20)
returns setof public.push_deliveries language plpgsql security invoker set search_path='' as $$
declare p record; items jsonb; claimed public.push_deliveries; n timestamptz=now();
begin
 -- No cleanup of ambiguous claims: they consume the budget and are never re-sent.
 delete from public.push_deliveries where created_at<n-interval '90 days';
 for p in select * from public.push_preferences pref where enabled
 and extract(hour from n at time zone timezone)::integer=hour
 and extract(dow from n at time zone timezone)::integer=any(weekdays)
 and exists(select 1 from public.push_subscriptions s where s.user_id=pref.user_id)
 and not exists(select 1 from public.push_deliveries d where d.user_id=pref.user_id and d.created_at>n-interval '48 hours')
 and (select count(*) from public.push_deliveries d where d.user_id=pref.user_id and d.created_at>n-interval '7 days')<2
 and public.push_candidates(pref.user_id,n)<>'[]'::jsonb
 order by (select max(created_at) from public.push_deliveries d where d.user_id=pref.user_id) nulls first,pref.user_id
 limit least(greatest(p_limit,1),100) for update skip locked loop
 items=public.push_candidates(p.user_id,n);
 if jsonb_array_length(items)=0 then continue; end if;
 insert into public.push_deliveries(user_id,items) values(p.user_id,items) returning * into claimed;
 insert into public.push_finished_receipts(user_id,user_book_id) select p.user_id,(x->>'book')::uuid from jsonb_array_elements(items) x where x->>'kind'='finished' on conflict do nothing;
 return next claimed;
 end loop;
end $$;
-- Last-moment consent/access check, filters withdrawn kinds and deleted/private friend records.
create function public.authorize_push_delivery(p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d public.push_deliveries; authorized_items jsonb; p public.push_preferences;
begin
 select * into d from public.push_deliveries where id=p_id and status='claimed' and created_at>now()-interval '10 minutes';
 if not found then return null; end if;
 select * into p from public.push_preferences where user_id=d.user_id and enabled;
 if not found then return null; end if;
 if extract(hour from now() at time zone p.timezone)::integer<>p.hour or not (extract(dow from now() at time zone p.timezone)::integer=any(p.weekdays)) then return null; end if;
 -- Re-evaluate underlying facts (the current claim/receipts would suppress candidates, so validate each item directly).
 select coalesce(jsonb_agg(x),'[]') into authorized_items from jsonb_array_elements(d.items) x where x->>'kind'=any(p.kinds)
 and (x->>'kind'<>'friends' or exists(select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id where not e.is_private and e.created_at>greatest(p.consent_at,now()-interval '7 days',coalesce((select seen_at from public.push_seen where user_id=d.user_id and kind='friends'),p.consent_at)) and exists(select 1 from public.friends f where status='accepted' and ((f.user_id=d.user_id and f.friend_id=ub.user_id) or (f.friend_id=d.user_id and f.user_id=ub.user_id)))))
 and (x->>'kind'<>'reminder' or (exists(select 1 from public.user_books where user_id=d.user_id and not is_finished) and not exists(select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id where ub.user_id=d.user_id and e.created_at>now()-interval '3 days')))
 and (x->>'kind'<>'finished' or exists(select 1 from public.user_books ub where ub.id=(x->>'book')::uuid and ub.user_id=d.user_id and ub.is_finished and ub.finished_at>=p.consent_at and ub.finished_at<=now()-interval '7 days' and not exists(select 1 from public.entries e where e.user_book_id=ub.id and e.created_at>=ub.finished_at and nullif(btrim(e.note),'') is not null)))
 and (x->>'kind'<>'weekly' or (exists(select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id where ub.user_id=d.user_id and e.created_at>now()-interval '7 days') and not exists(select 1 from public.push_seen where user_id=d.user_id and kind='weekly' and seen_at>now()-interval '1 day')))
 and (x->>'kind'<>'recall' or (not exists(select 1 from public.push_seen where user_id=d.user_id and kind='recall' and seen_at>now()-interval '14 days') and exists(select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id where e.id=(x->>'entry')::uuid and ub.user_id=d.user_id)));
 if jsonb_array_length(authorized_items)=0 then return null; end if;
 update public.push_deliveries set items=authorized_items where id=p_id;
 return jsonb_build_object('items',authorized_items,'subscriptions',(select coalesce(jsonb_agg(s),'[]') from public.push_subscriptions s where s.user_id=d.user_id));
end $$;
revoke all on function public.save_push_preferences(boolean,text[],text,integer,integer[]),public.save_push_subscription(text,text,text),public.mark_push_seen(text,uuid),public.push_candidates(uuid,timestamptz),public.claim_push_batch(integer),public.authorize_push_delivery(uuid) from public,anon,authenticated;
grant execute on function public.save_push_preferences(boolean,text[],text,integer,integer[]),public.save_push_subscription(text,text,text),public.mark_push_seen(text,uuid) to authenticated;
grant execute on function public.push_candidates(uuid,timestamptz),public.claim_push_batch(integer),public.authorize_push_delivery(uuid) to service_role;
