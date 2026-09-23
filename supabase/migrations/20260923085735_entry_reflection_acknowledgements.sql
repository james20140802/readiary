-- Lock the original before counting so inserts (FK key-share lock) cannot race
-- acknowledgement and cascade. Check ownership even if legacy entry RLS drifts.
create function public.mutate_entry_with_reflection_ack(
  p_entry_id uuid, p_patch jsonb default null,
  p_delete boolean default false, p_reflection_count integer default null
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare original public.entries%rowtype; edited public.entries%rowtype; affected integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select e.* into original from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where e.id=p_entry_id and ub.user_id=auth.uid() for update of e;
  if not found then return jsonb_build_object('not_found',true); end if;
  if p_delete then
    select count(*) into affected from public.entry_reflections where entry_id=p_entry_id;
  else
    if p_patch is null or jsonb_typeof(p_patch)<>'object' or exists (
      select 1 from jsonb_object_keys(p_patch) k where k not in ('quote','note','date','from_page','to_page','is_private')
    ) then raise exception 'Invalid entry patch' using errcode='22023'; end if;
    select * into edited from jsonb_populate_record(original,p_patch);
    affected=0;
    if original.is_private and not edited.is_private then
      select count(*) into affected from public.entry_reflections where entry_id=p_entry_id and not is_private;
    end if;
  end if;
  if affected>0 and p_reflection_count is distinct from affected then
    return jsonb_build_object('confirmation_required',true,'count',affected);
  end if;
  if p_delete then
    delete from public.entries where id=p_entry_id;
  else
    update public.entries set quote=edited.quote,note=edited.note,date=edited.date,
      from_page=edited.from_page,to_page=edited.to_page,is_private=edited.is_private where id=p_entry_id;
  end if;
  if not found then return jsonb_build_object('not_found',true); end if;
  return jsonb_build_object('id',p_entry_id);
end $$;
revoke all on function public.mutate_entry_with_reflection_ack(uuid,jsonb,boolean,integer) from public,anon;
grant execute on function public.mutate_entry_with_reflection_ack(uuid,jsonb,boolean,integer) to authenticated;

-- Changes to a thought's public state also serialize with the original's check.
create or replace function public.guard_entry_reflection_update() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare original_private boolean;
begin
  select is_private into original_private from public.entries where id=new.entry_id for key share;
  if original_private then new.is_private=true; end if;
  new.updated_at=clock_timestamp();
  return new;
end $$;
revoke all on function public.guard_entry_reflection_update() from public,anon,authenticated;
