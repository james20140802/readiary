-- 2026-10 주소 정리: 푸시 알림이 여는 주소에서 /protected 를 뺀다.
-- 이미 보낸 알림의 옛 주소는 next.config.ts 의 영구 이동(308)이 새 주소로 잇는다.
create or replace function public.push_candidates(p_user uuid,p_now timestamptz)
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
 if exists(select 1 from public.entries ent join public.user_books ub on ub.id=ent.user_book_id where not ent.is_private and ent.created_at>cutoff
 and exists(select 1 from public.friends f where f.status='accepted' and ((f.user_id=p_user and f.friend_id=ub.user_id) or (f.friend_id=p_user and f.user_id=ub.user_id)))) then
 result=result||jsonb_build_array(jsonb_build_object('kind','friends','href','/social','label','친구들이 새 기록을 남겼어요'));
 end if;
 end if;
 return result;
end $$;
