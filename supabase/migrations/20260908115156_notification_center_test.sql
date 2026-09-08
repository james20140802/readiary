-- Test sending is authorized by an expiring server-side user-ID allowlist.
-- Keep the last attempt on preferences so reconnecting a device cannot reset the limit.
alter table public.push_preferences add column last_test_at timestamptz;
create function public.claim_push_test(p_user uuid, p_endpoint text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare p public.push_preferences; s public.push_subscriptions;
begin
 select * into p from public.push_preferences where user_id=p_user for update;
 if not found or not p.enabled or p.last_test_at > clock_timestamp()-interval '1 minute' then return null; end if;
 select * into s from public.push_subscriptions where user_id=p_user and endpoint=p_endpoint;
 if not found then return null; end if;
 update public.push_preferences set last_test_at=clock_timestamp() where user_id=p_user;
 return to_jsonb(s);
end $$;
revoke all on function public.claim_push_test(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_push_test(uuid,text) to service_role;

-- One bounded request for the shared notification badge; RLS remains in force.
create function public.has_unread_notifications()
returns boolean language sql stable security invoker set search_path = '' as $$
 select exists(select 1 from public.notifications where user_id=(select auth.uid()) and read_at is null)
 or exists(select 1 from (
   select opened_at from public.push_deliveries where user_id=(select auth.uid())
   and status in ('sent','claimed') order by created_at desc limit 20
 ) recent where opened_at is null);
$$;
revoke all on function public.has_unread_notifications() from public,anon;
grant execute on function public.has_unread_notifications() to authenticated;
