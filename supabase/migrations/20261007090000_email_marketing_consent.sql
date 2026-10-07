-- Marketing consent is private, separate from required terms and Web Push.
create table public.email_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 email text,
 version integer not null default 0,
 consented_at timestamptz,
 withdrawn_at timestamptz,
 updated_at timestamptz not null default now()
);
create table public.email_consent_events (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 enabled boolean not null,
 email text,
 purpose text not null default 'service_news_events' check (purpose='service_news_events'),
 channel text not null default 'email' check (channel='email'),
 copy_version text not null,
 source text not null check (source in ('onboarding','settings','unsubscribe','email_change')),
 expected_version integer not null,
 version integer not null,
 created_at timestamptz not null default now(),
 profile_input_hash text,
 primary key(user_id, request_id)
);
create table public.email_deliveries (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 email text not null,
 content_hash text not null,
 token_hash text not null unique,
 preference_version integer not null,
 status text not null check(status in ('sending','unknown','sent')),
 provider_id text,
 first_attempt_at timestamptz not null default now(),
 last_attempt_at timestamptz not null default now()
);
alter table public.email_preferences enable row level security;
alter table public.email_consent_events enable row level security;
alter table public.email_deliveries enable row level security;
revoke all on public.email_preferences, public.email_consent_events, public.email_deliveries from anon, authenticated;
grant select on public.email_preferences, public.email_consent_events to authenticated;
create policy email_preferences_owner on public.email_preferences for select to authenticated using(user_id=auth.uid());
create policy email_events_owner on public.email_consent_events for select to authenticated using(user_id=auth.uid());
grant all on public.email_preferences, public.email_consent_events, public.email_deliveries to service_role;

-- Caller must be a server that has validated the session. Never grant to client roles.
create function public.save_email_consent(p_user uuid, p_enabled boolean, p_request uuid,
 p_expected integer, p_source text, p_copy text, p_profile jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u auth.users; old public.email_preferences; prior public.email_consent_events; result public.email_preferences;
begin
 select * into u from auth.users where id=p_user for update;
 if not found then raise exception 'account_missing' using errcode='P0001'; end if;
 if p_enabled is null or p_request is null or p_expected is null or p_expected<0
 or p_source not in ('onboarding','settings') or p_source is null or p_copy is distinct from 'email-news-v1'
 or (p_source='onboarding') <> (p_profile is not null) then
 raise exception 'invalid_consent' using errcode='P0001'; end if;
 select * into prior from public.email_consent_events where user_id=p_user and request_id=p_request;
 if found then
  if prior.enabled is distinct from p_enabled or prior.source<>p_source or prior.expected_version<>p_expected
   or prior.copy_version<>p_copy or prior.profile_input_hash is distinct from md5(p_profile::text) then
   raise exception 'request_conflict' using errcode='P0001';
  end if;
  -- Return current truth, never replay an old write over a later withdrawal.
  return (select to_jsonb(e) from public.email_preferences e where user_id=p_user);
 end if;
 select * into old from public.email_preferences where user_id=p_user;
 if coalesce(old.version,0)<>p_expected then raise exception 'version_conflict' using errcode='P0001'; end if;
 if p_enabled and (u.email is null or u.email_confirmed_at is null) then
  raise exception 'email_unconfirmed' using errcode='P0001'; end if;
 if p_profile is not null then
  insert into public.profiles(id,name,nickname,tag,bio)
  values(p_user,p_profile->>'name',p_profile->>'nickname',p_profile->>'tag',p_profile->>'bio');
 end if;
 insert into public.email_preferences(user_id,enabled,email,version,consented_at,withdrawn_at)
 values(p_user,p_enabled,case when p_enabled then u.email else old.email end,p_expected+1,
 case when p_enabled then now() else old.consented_at end,case when not p_enabled then now() else old.withdrawn_at end)
 on conflict(user_id) do update set enabled=excluded.enabled,email=excluded.email,version=excluded.version,
 consented_at=excluded.consented_at,withdrawn_at=excluded.withdrawn_at,updated_at=now()
 returning * into result;
 insert into public.email_consent_events(user_id,request_id,enabled,email,copy_version,source,expected_version,version,profile_input_hash)
 values(p_user,p_request,p_enabled,result.email,p_copy,p_source,p_expected,result.version,md5(p_profile::text));
 return to_jsonb(result);
end $$;

-- Address changes revoke the old consent; changing it back does not silently restore it.
create function public.revoke_changed_email_consent() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.email_preferences;
begin
 if new.email is distinct from old.email or (old.email_confirmed_at is not null and new.email_confirmed_at is null) then
  update public.email_preferences set enabled=false,version=version+1,withdrawn_at=now(),updated_at=now()
  where user_id=new.id and enabled returning * into p;
  if found then
   insert into public.email_consent_events(user_id,request_id,enabled,email,copy_version,source,expected_version,version)
   values(new.id,gen_random_uuid(),false,p.email,'email-news-v1','email_change',p.version-1,p.version);
  end if;
 end if;
 return new;
end $$;
create trigger email_address_consent_reset after update of email,email_confirmed_at on auth.users
 for each row execute function public.revoke_changed_email_consent();

create function public.withdraw_email_by_token(p_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare target uuid; p public.email_preferences;
begin
 select user_id into target from public.email_deliveries where token_hash=p_hash;
 if target is null then return false; end if;
 perform 1 from auth.users where id=target for update;
 if not found then return false; end if;
 update public.email_preferences set enabled=false,version=version+1,withdrawn_at=now(),updated_at=now()
 where user_id=target and enabled returning * into p;
 if found then
  insert into public.email_consent_events(user_id,request_id,enabled,email,copy_version,source,expected_version,version)
  values(target,gen_random_uuid(),false,p.email,'email-news-v1','unsubscribe',p.version-1,p.version);
 end if;
 return true;
end $$;

-- A durable delivery ID binds address, consent generation and content across network retries.
create function public.claim_marketing_email(p_user uuid,p_id uuid,p_content_hash text,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u auth.users; p public.email_preferences; d public.email_deliveries;
begin
 select * into u from auth.users where id=p_user for update;
 if not found then return null; end if;
 select * into p from public.email_preferences where user_id=p_user;
 if not coalesce(p.enabled,false) or u.email_confirmed_at is null or u.email is distinct from p.email then return null; end if;
 select * into d from public.email_deliveries where id=p_id;
 if found then
  if d.user_id<>p_user or d.content_hash<>p_content_hash or d.token_hash<>p_token_hash
   or d.email<>p.email or d.preference_version<>p.version then raise exception 'delivery_conflict'; end if;
  if d.status='sent' then return jsonb_build_object('sent',true,'provider_id',d.provider_id); end if;
  if d.first_attempt_at < now()-interval '23 hours' then raise exception 'delivery_needs_review'; end if;
  if d.last_attempt_at > now()-interval '2 minutes' then return null; end if;
  update public.email_deliveries set status='sending',last_attempt_at=now() where id=p_id;
 else
  insert into public.email_deliveries(id,user_id,email,content_hash,token_hash,preference_version,status)
  values(p_id,p_user,p.email,p_content_hash,p_token_hash,p.version,'sending');
 end if;
 return jsonb_build_object('email',p.email,'version',p.version);
end $$;

revoke all on function public.save_email_consent(uuid,boolean,uuid,integer,text,text,jsonb),
 public.revoke_changed_email_consent(), public.withdraw_email_by_token(text),
 public.claim_marketing_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.save_email_consent(uuid,boolean,uuid,integer,text,text,jsonb),
 public.withdraw_email_by_token(text),public.claim_marketing_email(uuid,uuid,text,text) to service_role;
