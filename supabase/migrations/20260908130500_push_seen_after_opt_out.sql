create or replace function public.mark_push_seen(p_kind text,p_delivery uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized'; end if;
 -- Reading past deliveries remains available after notification opt-out.
 if p_delivery is not null then update public.push_deliveries set opened_at=now() where id=p_delivery and user_id=auth.uid(); end if;
 if not exists(select 1 from public.push_preferences where user_id=auth.uid() and enabled) then return; end if;
 if p_kind in ('friends','weekly','recall') then
  insert into public.push_seen(user_id,kind) values(auth.uid(),p_kind) on conflict(user_id,kind) do update set seen_at=now();
 end if;
 update public.push_preferences set seen_at=now() where user_id=auth.uid();
end $$;
