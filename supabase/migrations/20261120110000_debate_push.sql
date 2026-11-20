-- 문장 토론 기기 푸시. 독서 소식 종류에 'debate'(토론 소식)를 더한다.
-- 답·답글마다 보내지 않는다. 기존 발송 틀을 그대로 쓴다: 받는 사람이 고른 시각에 후보를 한 번 모아
-- 다른 독서 소식과 한 푸시로 묶고, 전체 빈도 제한(48시간 간격, 7일에 2번)도 claim_push_batch가 그대로 건다.
-- 기존 계정의 종류 목록에는 들어 있지 않으므로, 설정에서 고른 사람에게만 간다.
-- 20261120100000_debate_notifications.sql 다음에 적용한다(알림의 debate_id 열을 읽는다).
begin;

alter table public.push_preferences drop constraint push_preferences_kinds_check;
alter table public.push_preferences add constraint push_preferences_kinds_check
  check (kinds <@ array['reminder','finished','weekly','recall','friends','debate']::text[]);

-- 발송은 로그인한 사람 없이 돌아서 auth.uid()에 기대는 can_see_debate_notification을 쓸 수 없다.
-- 같은 판단을 받는 사람을 인자로 받아 한다: 토론을 볼 수 있고(발제자가 활성이고 본인이거나 수락한 친구),
-- 답이 걸려 있으면 그 답이 남아 있고 숨겨지지 않았거나 받는 사람이 쓴 사람·발제자다.
-- 남을 대신해 물을 수 있으므로 발송(service_role)만 실행한다.
create function public.debate_notification_visible_to(p_user uuid, p_debate_id uuid, p_answer_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.debates d
    where d.id = p_debate_id
      and public.is_account_active(d.user_id)
      and (
        d.user_id = p_user
        or exists (
          select 1 from public.friends f
          where f.status = 'accepted'
            and ((f.user_id = p_user and f.friend_id = d.user_id) or (f.friend_id = p_user and f.user_id = d.user_id))
        )
      )
      and (
        p_answer_id is null
        or exists (
          select 1 from public.debate_answers a
          where a.id = p_answer_id and a.debate_id = d.id and a.deleted_at is null
            and (a.hidden_at is null or a.user_id = p_user or d.user_id = p_user)
        )
      )
  );
$$;
revoke all on function public.debate_notification_visible_to(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.debate_notification_visible_to(uuid, uuid, uuid) to service_role;

-- 본문은 20261112092000의 정의에 debate 종류만 더했다. create or replace는 기존 권한을 유지한다.
create or replace function public.push_candidates(p_user uuid, p_now timestamp with time zone)
returns jsonb
language plpgsql
set search_path to ''
as $function$
declare p public.push_preferences; result jsonb='[]'; last_record timestamptz; last_kind timestamptz; b record; recalled record; cutoff timestamptz; local_day integer;
begin
 -- 유예 중인 계정에는 보내지 않는다.
 if not public.is_account_active(p_user) then return result; end if;
 select * into p from public.push_preferences where user_id=p_user and enabled;
 if not found then return result; end if;
 local_day=extract(dow from p_now at time zone p.timezone)::integer;
 select max(e.created_at) into last_record from public.entries e join public.user_books ub on ub.id=e.user_book_id where ub.user_id=p_user;
 if 'reminder'=any(p.kinds) and coalesce(last_record,p.consent_at)<=p_now-interval '3 days'
 and exists(select 1 from public.user_books where user_id=p_user and not is_finished)
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"reminder"}]')
 and (select count(*) from public.push_deliveries where user_id=p_user and created_at>greatest(coalesce(last_record,p.consent_at),p.seen_at) and items @> '[{"kind":"reminder"}]')<2 then
 result=result||jsonb_build_array(jsonb_build_object('kind','reminder','href','/books','label','읽고 있는 책에 한 문장 남겨볼까요?'));
 end if;
 if 'finished'=any(p.kinds) then
 for b in select ub.id,ub.book_id from public.user_books ub where ub.user_id=p_user and ub.is_finished and ub.finished_at>=p.consent_at and ub.finished_at<=p_now-interval '7 days'
 and not exists(select 1 from public.entries e where e.user_book_id=ub.id and e.created_at>=ub.finished_at and nullif(btrim(e.note),'') is not null)
 and not exists(select 1 from public.push_finished_receipts r where r.user_id=p_user and r.user_book_id=ub.id)
 order by ub.finished_at limit 5 loop
 result=result||jsonb_build_array(jsonb_build_object('kind','finished','book',b.id,'href','/books/'||b.book_id||'/entry/new','label','완독한 책의 여운을 남겨보세요'));
 end loop;
 end if;
 if 'weekly'=any(p.kinds) and local_day=0 and last_record>p_now-interval '7 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='weekly' and seen_at>p_now-interval '1 day')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"weekly"}]') then
 result=result||jsonb_build_array(jsonb_build_object('kind','weekly','href','/notifications/weekly','label','이번 주에 남긴 기록을 돌아보세요'));
 end if;
 if 'recall'=any(p.kinds) and p.consent_at<=p_now-interval '14 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='recall' and seen_at>p_now-interval '14 days')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '14 days' and items @> '[{"kind":"recall"}]') then
 select ent.id into recalled from public.entries ent join public.user_books ub on ub.id=ent.user_book_id
 where ub.user_id=p_user and ent.date<=(p_now at time zone p.timezone)::date-30 and nullif(btrim(ent.quote),'') is not null
 and not exists(select 1 from public.push_deliveries d where d.user_id=p_user and d.items @> jsonb_build_array(jsonb_build_object('entry',ent.id)))
 order by ent.date,ent.created_at,ent.id limit 1;
 if found then result=result||jsonb_build_array(jsonb_build_object('kind','recall','entry',recalled.id,'href','/entry/'||recalled.id,'label','예전에 남긴 문장을 다시 만나보세요')); end if;
 end if;
 if 'friends'=any(p.kinds) and local_day=3
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"friends"}]') then
 select greatest(p.consent_at,p_now-interval '7 days',coalesce((select seen_at from public.push_seen where user_id=p_user and kind='friends'),p.consent_at)) into cutoff;
 -- 유예 중인 친구가 남긴 기록은 세지 않는다.
 if exists(select 1 from public.entries ent join public.user_books ub on ub.id=ent.user_book_id where not ent.is_private and ent.created_at>cutoff
 and public.is_account_active(ub.user_id)
 and exists(select 1 from public.friends f where f.status='accepted' and ((f.user_id=p_user and f.friend_id=ub.user_id) or (f.friend_id=p_user and f.user_id=ub.user_id)))) then
 result=result||jsonb_build_array(jsonb_build_object('kind','friends','href','/social','label','친구들이 새 기록을 남겼어요'));
 end if;
 end if;
 -- 문장 토론: 안 읽은 토론 알림이 지금도 보일 때. 답·답글마다 보내지 않고 마지막으로 보낸 뒤의 소식을 한 번에 알린다.
 -- 누가 무엇을 했는지는 푸시에 싣지 않는다. 유예 중인 사람이 남긴 소식은 세지 않는다.
 if 'debate'=any(p.kinds) and exists(select 1 from public.notifications n where n.user_id=p_user and n.debate_id is not null and n.read_at is null
 and n.created_at<=p_now
 and n.created_at>greatest(p.consent_at,coalesce((select max(d.created_at) from public.push_deliveries d where d.user_id=p_user and d.items @> '[{"kind":"debate"}]'),p.consent_at))
 and public.is_account_active(n.actor_id)
 and public.debate_notification_visible_to(p_user,n.debate_id,n.debate_answer_id)) then
 result=result||jsonb_build_array(jsonb_build_object('kind','debate','href','/social/talk','label','토론에 새 소식이 있어요'));
 end if;
 return result;
end $function$;

-- 보내기 직전의 다시 확인. 본문은 20260907120231의 정의에 debate 종류만 더했다: 그사이 읽었거나 볼 수 없게 됐으면 뺀다.
create or replace function public.authorize_push_delivery(p_id uuid)
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
 and (x->>'kind'<>'debate' or exists(select 1 from public.notifications n where n.user_id=d.user_id and n.debate_id is not null and n.read_at is null and public.is_account_active(n.actor_id) and public.debate_notification_visible_to(d.user_id,n.debate_id,n.debate_answer_id)))
 and (x->>'kind'<>'recall' or (not exists(select 1 from public.push_seen where user_id=d.user_id and kind='recall' and seen_at>now()-interval '14 days') and exists(select 1 from public.entries e join public.user_books ub on ub.id=e.user_book_id where e.id=(x->>'entry')::uuid and ub.user_id=d.user_id and e.date<=(now() at time zone p.timezone)::date-30 and nullif(btrim(e.quote),'') is not null)));
 if jsonb_array_length(authorized_items)=0 then return null; end if;
 update public.push_deliveries set items=authorized_items where id=p_id;
 return jsonb_build_object('items',authorized_items,'subscriptions',(select coalesce(jsonb_agg(s),'[]') from public.push_subscriptions s where s.user_id=d.user_id));
end $$;

commit;
