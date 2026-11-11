-- 계정 탈퇴: 신청하면 14일 동안 숨겨진 채 복구할 수 있고, 기한이 지나면 서버가 실제로 삭제한다.
-- 이 마이그레이션은 상태 테이블과 신청·복구·삭제 RPC만 둔다. 숨김 정책과 쓰기 차단은 뒤이은 마이그레이션이 맡는다.

-- 탈퇴 신청 상태. 행이 있으면 유예 중이다.
create table public.account_deletions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  purge_after timestamptz not null
);
-- 프록시가 profiles 조회에 account_deletions(purge_after)를 임베드할 수 있도록 profiles로도 잇는다.
alter table public.account_deletions
  add constraint account_deletions_profile_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.account_deletions enable row level security;
create policy own_account_deletion on public.account_deletions
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.account_deletions from public, anon, authenticated;
grant select on public.account_deletions to authenticated;
grant all on public.account_deletions to service_role;

-- 삭제가 끝난 계정의 기록. 사용자가 이미 지워졌으므로 FK를 두지 않는다. 서버만 다룬다.
create table public.account_deletion_purges (
  user_id uuid primary key,
  purged_at timestamptz not null default now()
);
alter table public.account_deletion_purges enable row level security;
revoke all on public.account_deletion_purges from public, anon, authenticated;
grant all on public.account_deletion_purges to service_role;

-- 유예 중이 아니면 true. 행이 없으면 활성이다.
create function public.is_account_active(p_user uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select not exists (select 1 from public.account_deletions where user_id = p_user)
$$;
revoke all on function public.is_account_active(uuid) from public;
grant execute on function public.is_account_active(uuid) to authenticated, anon, service_role;

-- 현재 사용자가 유예 중이면 쓰기를 거부한다.
create function public.assert_account_active() returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_account_active(auth.uid()) then
    raise exception 'account_pending_deletion' using errcode = '42501';
  end if;
end $$;
revoke all on function public.assert_account_active() from public;
grant execute on function public.assert_account_active() to authenticated, service_role;

-- 탈퇴 신청(서비스 롤 전용). 이미 신청했으면 기존 기한을 그대로 돌려준다. 이 기기 알림 구독도 함께 지운다.
create function public.request_account_deletion(p_user uuid) returns timestamptz
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_at timestamptz;
begin
  insert into public.account_deletions (user_id, purge_after)
  values (p_user, now() + interval '14 days')
  on conflict (user_id) do nothing;
  select purge_after into v_at from public.account_deletions where user_id = p_user;
  delete from public.push_subscriptions where user_id = p_user;
  return v_at;
end $$;
revoke all on function public.request_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid) to service_role;

-- 탈퇴 취소. 본인 행만 지운다. 지운 행이 있으면 true.
create function public.cancel_account_deletion() returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  delete from public.account_deletions where user_id = auth.uid();
  get diagnostics v_count = row_count;
  return v_count > 0;
end $$;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

-- 기한이 지난 신청을 잡아 돌려준다(서비스 롤 전용). 동시에 도는 작업은 건너뛴다.
create function public.claim_due_account_deletions(p_limit int) returns setof uuid
language sql security definer set search_path = public, pg_temp as $$
  select user_id from public.account_deletions
  where purge_after <= now()
  order by purge_after
  limit greatest(p_limit, 0)
  for update skip locked
$$;
revoke all on function public.claim_due_account_deletions(int) from public, anon, authenticated;
grant execute on function public.claim_due_account_deletions(int) to service_role;

create function public.record_account_purge(p_user uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.account_deletion_purges (user_id) values (p_user)
  on conflict (user_id) do update set purged_at = now()
$$;
revoke all on function public.record_account_purge(uuid) from public, anon, authenticated;
grant execute on function public.record_account_purge(uuid) to service_role;

-- 30일이 지난 삭제 기록을 지우고 그 수를 돌려준다.
create function public.prune_account_purges() returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  delete from public.account_deletion_purges where purged_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.prune_account_purges() from public, anon, authenticated;
grant execute on function public.prune_account_purges() to service_role;
