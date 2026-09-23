-- A thought belongs to its original entry; it never changes the original text or activity counts.
create table public.entry_reflections (
  id uuid primary key,
  entry_id uuid not null references public.entries(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 10000 and body !~ '^[[:space:]]*$'),
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index entry_reflections_entry_time_idx on public.entry_reflections(entry_id, created_at, id);
alter table public.entry_reflections enable row level security;
revoke all on public.entry_reflections from public, anon, authenticated;
grant select, delete on public.entry_reflections to authenticated;
grant insert(id, entry_id, body, is_private) on public.entry_reflections to authenticated;
grant update(body, is_private) on public.entry_reflections to authenticated;

create policy reflections_read on public.entry_reflections for select to authenticated using (
  exists (select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where e.id=entry_id and (ub.user_id=(select auth.uid()) or
      (not e.is_private and not entry_reflections.is_private and public.is_friend_with(ub.user_id))))
);
create policy reflections_insert on public.entry_reflections for insert to authenticated with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where e.id=entry_id and ub.user_id=(select auth.uid()) and
      (entry_reflections.is_private or not e.is_private))
);
create policy reflections_update on public.entry_reflections for update to authenticated
  using (user_id=(select auth.uid()) and exists (
    select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where e.id=entry_id and ub.user_id=(select auth.uid())))
  with check (user_id=(select auth.uid()) and exists (
    select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where e.id=entry_id and ub.user_id=(select auth.uid())));
create policy reflections_delete on public.entry_reflections for delete to authenticated
  using (user_id=(select auth.uid()) and exists (
    select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where e.id=entry_id and ub.user_id=(select auth.uid())));

create function public.guard_entry_reflection_update() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if old.is_private and not new.is_private and exists (
    select 1 from public.entries where id=new.entry_id and is_private
  ) then
    raise exception 'Original entry is private' using errcode='23514';
  end if;
  new.updated_at=clock_timestamp();
  return new;
end $$;
revoke all on function public.guard_entry_reflection_update() from public,anon,authenticated;
create trigger entry_reflection_update before update on public.entry_reflections
for each row execute function public.guard_entry_reflection_update();

-- One bounded request per list, RLS also filters the count and the preview.
create function public.get_entry_reflection_summaries(p_entry_ids uuid[])
returns table(entry_id uuid, total bigint, latest jsonb)
language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
  if cardinality(p_entry_ids)>100 then raise exception 'At most 100 entries' using errcode='22023'; end if;
  return query
  select e.id, (select count(*) from public.entry_reflections r where r.entry_id=e.id),
    (select jsonb_build_object('id',r.id,'body',left(r.body,240),'created_at',r.created_at,
      'is_private',r.is_private) from public.entry_reflections r where r.entry_id=e.id
      order by r.created_at desc,r.id desc limit 1)
  from public.entries e where e.id=any(p_entry_ids);
end $$;
revoke all on function public.get_entry_reflection_summaries(uuid[]) from public,anon;
grant execute on function public.get_entry_reflection_summaries(uuid[]) to authenticated;
