-- Operator-owned rollout configuration. Never expose the allowlist to clients.
create table public.feature_rollouts (
  key text primary key,
  enabled boolean not null default false,
  percentage integer not null default 0 check (percentage between 0 and 100),
  user_ids uuid[] not null default '{}'
);
alter table public.feature_rollouts enable row level security;
revoke all on public.feature_rollouts from public, anon, authenticated;
insert into public.feature_rollouts(key) values ('entry_reflections');

-- The only definer surface returns a boolean for auth.uid(), never an arbitrary user.
create function public.entry_reflections_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select enabled and auth.uid() is not null and (
    auth.uid() = any(user_ids) or
    (('x' || substr(md5('entry_reflections:' || auth.uid()::text), 1, 8))::bit(32)::bigint % 100) < percentage
  ) from public.feature_rollouts where key = 'entry_reflections'), false)
$$;
revoke all on function public.entry_reflections_enabled() from public, anon;
grant execute on function public.entry_reflections_enabled() to authenticated;

-- Direct Data API writes must honor rollout too; existing ownership RLS still applies.
-- Reads remain available under existing RLS so disabling rollout does not destroy data
-- or suppress delete/republication warnings about existing thoughts.
create policy reflections_rollout_insert on public.entry_reflections as restrictive
for insert to authenticated with check ((select public.entry_reflections_enabled()));
create policy reflections_rollout_update on public.entry_reflections as restrictive
for update to authenticated using ((select public.entry_reflections_enabled()))
with check ((select public.entry_reflections_enabled()));
create policy reflections_rollout_delete on public.entry_reflections as restrictive
for delete to authenticated using ((select public.entry_reflections_enabled()));
