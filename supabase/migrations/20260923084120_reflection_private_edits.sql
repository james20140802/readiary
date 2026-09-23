-- An editor may have loaded before another tab made the original private.
-- Every edit must use the current original's privacy, not the prior thought state.
create or replace function public.guard_entry_reflection_update() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if exists (select 1 from public.entries where id=new.entry_id and is_private) then
    new.is_private=true;
  end if;
  new.updated_at=clock_timestamp();
  return new;
end $$;
revoke all on function public.guard_entry_reflection_update() from public,anon,authenticated;
