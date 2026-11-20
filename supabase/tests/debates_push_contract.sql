-- 문장 토론 기기 푸시: 종류 'debate'. 준비는 debates-fixture.sql.
-- 답·답글마다 보내지 않는다. 정한 시각에, 안 읽은 토론 알림이 지금 보일 때만 다른 독서 소식과 한 번에 묶는다.
-- 전체 빈도 제한(48시간 간격, 7일에 2번)은 claim_push_batch가 그대로 건다(push_contract.sql).

do $$
begin
  if has_function_privilege('authenticated', 'public.debate_notification_visible_to(uuid,uuid,uuid)', 'execute')
     or has_function_privilege('anon', 'public.debate_notification_visible_to(uuid,uuid,uuid)', 'execute') then
    raise exception 'only the sender may ask on behalf of another user';
  end if;
end $$;

create function t.debate_push(p_user uuid) returns jsonb language sql as $$
  select to_jsonb(public.push_candidates(p_user, now()) @> '[{"kind":"debate"}]');
$$;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

set role authenticated;
do $$
declare d uuid; b1 uuid; fr uuid;
begin
  perform t.as_user(t.id(1));
  d := public.create_debate(t.id(101), '질문', '[]'::jsonb);
  perform t.as_user(t.id(2));
  b1 := public.add_debate_answer(d, null, 'agree', 'B의 답', null);
  perform public.notify_debate_event('debate_answer', b1);
  perform t.as_user(t.id(6));
  fr := public.add_debate_reply(b1, 'F의 답글');
  perform public.notify_debate_event('debate_reply', fr);
  perform set_config('t.d', d::text, false);
  perform set_config('t.b1', b1::text, false);
  perform set_config('t.fr', fr::text, false);
  -- 종류에 debate를 고를 수 있다
  perform t.as_user(t.id(2));
  perform public.save_push_preferences(true, array['debate'], 'Asia/Seoul', 20, array[0,1,2,3,4,5,6]);
  perform public.save_push_subscription('https://fcm.googleapis.com/b', repeat('A', 87), repeat('B', 22));
  perform t.as_user(t.id(1));
  perform public.save_push_preferences(true, array['reminder'], 'Asia/Seoul', 20, array[0,1,2,3,4,5,6]);
end $$;
reset role;
-- 동의는 알림보다 먼저 했다
update public.push_preferences set consent_at = now() - interval '1 day', seen_at = now() - interval '1 day';

do $$
declare b uuid := t.id(2); fr uuid := current_setting('t.fr')::uuid;
begin
  perform t.eq('unread reply makes a candidate', t.debate_push(b), 'true');
  perform t.eq('label and link carry no names',
    (select x - 'kind' from jsonb_array_elements(public.push_candidates(b, now())) x where x ->> 'kind' = 'debate'),
    '{"href":"/social/talk","label":"토론에 새 소식이 있어요"}');
  -- 고르지 않은 사람에게는 보내지 않는다
  perform t.eq('not chosen', t.debate_push(t.id(1)), 'false');

  -- 숨긴 답글이면 보내지 않고, 풀면 다시 후보다
  update public.debate_answers set hidden_at = now() where id = fr;
  perform t.eq('hidden reply', t.debate_push(b), 'false');
  update public.debate_answers set hidden_at = null where id = fr;
  perform t.eq('unhidden reply', t.debate_push(b), 'true');

  -- 보는 사람 기준 판단은 알림함(RLS)과 같다
  perform t.eq('visible_to agrees', to_jsonb(public.debate_notification_visible_to(b, current_setting('t.d')::uuid, fr)), 'true');
  perform t.eq('stranger sees nothing', to_jsonb(public.debate_notification_visible_to(t.id(3), current_setting('t.d')::uuid, fr)), 'false');
  perform t.eq('friend of owner sees', to_jsonb(public.debate_notification_visible_to(t.id(7), current_setting('t.d')::uuid, null)), 'true');

  -- 친구가 아니게 되면 보내지 않는다
  delete from public.friends where user_id = t.id(1) and friend_id = b;
  perform t.eq('former friend', t.debate_push(b), 'false');
  insert into public.friends(user_id, friend_id, status, accepted_at) values (t.id(1), b, 'accepted', now());
  perform t.eq('friend again', t.debate_push(b), 'true');

  -- 탈퇴 유예 중인 사람이 남긴 소식으로는 보내지 않는다
  insert into public.account_deletions (user_id, purge_after) values (t.id(6), now() + interval '14 days');
  perform t.eq('pending actor', t.debate_push(b), 'false');
  delete from public.account_deletions where user_id = t.id(6);
end $$;

-- ── 한 번 보낸 소식으로는 다시 보내지 않는다. 새 소식이 오면 다시 후보다 ─
update public.push_preferences set timezone = (select name from pg_timezone_names where extract(hour from now() at time zone name) = 12 limit 1), hour = 12
  where user_id = t.id(2);
set role service_role;
do $$
declare n int; v jsonb;
begin
  select count(*) into n from public.claim_push_batch(5);
  perform t.eq('claimed once', n, '1');
  v := public.authorize_push_delivery((select id from public.push_deliveries limit 1));
  perform t.eq('authorized with the debate item', v -> 'items' @> '[{"kind":"debate"}]', 'true');
  perform t.eq('already sent', t.debate_push(t.id(2)), 'false');
end $$;
reset role;

-- 보내기 직전에 읽었으면 보내지 않는다
update public.notifications set read_at = now() where user_id = t.id(2);
set role service_role;
do $$
begin
  if public.authorize_push_delivery((select id from public.push_deliveries limit 1)) is not null then
    raise exception 'read notification must not be pushed';
  end if;
end $$;
reset role;

-- 이 파일은 한 트랜잭션이라 now()가 같다. 보낸 시각을 조금 앞으로 당겨 그 뒤에 온 소식을 만든다
update public.push_deliveries set created_at = created_at - interval '1 minute';
set role authenticated;
do $$
begin
  perform t.as_user(t.id(1));
  perform public.notify_debate_event('debate_reply', public.add_debate_reply(current_setting('t.b1')::uuid, 'A의 답글'));
end $$;
reset role;
do $$
begin
  perform t.eq('newer news is a candidate again', t.debate_push(t.id(2)), 'true');
  update public.notifications set read_at = now() where user_id = t.id(2);
  perform t.eq('read news is not', t.debate_push(t.id(2)), 'false');
end $$;
