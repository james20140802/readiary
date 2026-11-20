-- 문장 토론 알림: 답·답글·생각이 바뀌었어요·정리. 준비는 debates-fixture.sql.
-- 알림은 notify_debate_event가 사실(내가 남긴 답, 내가 누른 표시, 내가 정리한 토론)을 확인한 뒤에만 만든다.
-- 받은 사람이 지금 볼 수 없는 토론·답의 알림은 지우지 않고 가려 둔다.

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.notify_debate_event(text,uuid)',
    'public.retract_debate_notification(text,uuid)',
    'public.can_see_debate_notification(uuid,uuid)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;
end $$;

-- 알림 수를 받는 사람의 눈으로 센다(RLS 적용). p_where는 notifications의 조건이다.
create function t.inbox(p_user uuid, p_where text default 'true') returns jsonb language plpgsql as $$
declare n int;
begin
  perform t.as_user(p_user);
  execute format('select count(*)::int from public.notifications where user_id = %L and (%s)', p_user, p_where) into n;
  return to_jsonb(n);
end;
$$;
grant execute on function t.inbox(uuid, text) to authenticated;

set role authenticated;

do $$
declare d uuid;
begin
  perform t.as_user(t.id(1));
  d := public.create_debate(t.id(101), '질문', '[{"start":0,"end":5}]'::jsonb);
  perform set_config('t.d', d::text, false);
  perform set_config('t.a1', public.add_debate_answer(d, null, 'agree', 'A의 답', null)::text, false);
  perform t.as_user(t.id(2));
  perform set_config('t.b1', public.add_debate_answer(d, 1::smallint, 'differ', 'B의 답', null)::text, false);
end $$;

-- ── 답: 발제자에게, 답마다 한 번 ─
do $$
declare d uuid := current_setting('t.d')::uuid; b1 uuid := current_setting('t.b1')::uuid;
begin
  perform t.as_user(t.id(2));
  perform public.notify_debate_event('debate_answer', b1);
  perform public.notify_debate_event('debate_answer', b1);
  perform t.eq('owner hears of the answer once', t.inbox(t.id(1), format('type = ''debate_answer'' and actor_id = %L and debate_id = %L and debate_answer_id = %L', t.id(2), d, b1)), '1');
  -- 자기 토론에 남긴 자기 답은 알리지 않는다
  perform t.as_user(t.id(1));
  perform public.notify_debate_event('debate_answer', current_setting('t.a1')::uuid);
  perform t.eq('no self notification', to_jsonb(t.real_count('notifications', 'type = ''debate_answer''')), '1');
  -- 남의 답으로는 알림을 만들지 못한다
  perform t.as_user(t.id(6));
  perform public.notify_debate_event('debate_answer', b1);
  perform t.as_user(t.id(3));
  perform public.notify_debate_event('debate_answer', b1);
  perform t.eq('only the author notifies', to_jsonb(t.real_count('notifications', 'type = ''debate_answer''')), '1');
  perform t.eq('unknown type', to_jsonb(t.err(format('select public.notify_debate_event(%L, %L)', 'like', b1))), '"invalid_type"');
  perform t.as_anon();
  perform t.eq('signed out', to_jsonb(t.err(format('select public.notify_debate_event(%L, %L)', 'debate_answer', b1))), '"not authenticated"');
end $$;

-- ── 답글: 답 쓴 사람에게. 발제자가 단 답글도 알린다 ─
do $$
declare b1 uuid := current_setting('t.b1')::uuid; fr uuid; ar uuid; br uuid;
begin
  perform t.as_user(t.id(6));
  fr := public.add_debate_reply(b1, 'F의 답글');
  perform set_config('t.fr', fr::text, false);
  perform public.notify_debate_event('debate_reply', fr);
  perform public.notify_debate_event('debate_reply', fr);
  perform t.as_user(t.id(1));
  ar := public.add_debate_reply(b1, 'A의 답글');
  perform public.notify_debate_event('debate_reply', ar);
  perform t.as_user(t.id(2));
  br := public.add_debate_reply(b1, 'B가 자기 답에 단 답글');
  perform public.notify_debate_event('debate_reply', br);
  -- 종류와 대상이 어긋나면 만들지 않는다
  perform public.notify_debate_event('debate_reply', b1);
  perform t.as_user(t.id(6));
  perform public.notify_debate_event('debate_answer', fr);
  perform t.eq('answer author hears of each reply', t.inbox(t.id(2), 'type = ''debate_reply'''), '2');
  perform t.eq('reply from F', t.inbox(t.id(2), format('type = ''debate_reply'' and actor_id = %L and debate_answer_id = %L', t.id(6), fr)), '1');
  perform t.eq('reply from owner', t.inbox(t.id(2), format('type = ''debate_reply'' and actor_id = %L', t.id(1))), '1');
  perform t.eq('owner is not told about replies', t.inbox(t.id(1), 'type = ''debate_reply'''), '0');
  perform t.eq('no mismatched rows', to_jsonb(t.real_count('notifications', 'type in (''debate_answer'', ''debate_reply'')')), '3');
end $$;

-- ── 생각이 바뀌었어요: 답마다 하루에 한 번 ─
do $$
declare b1 uuid := current_setting('t.b1')::uuid;
begin
  -- 누르지 않고는 알리지 못한다
  perform t.as_user(t.id(6));
  perform public.notify_debate_event('debate_move', b1);
  perform t.eq('no move no notification', to_jsonb(t.real_count('notifications', 'type = ''debate_move''')), '0');
  perform public.set_debate_move(b1, true);
  perform public.notify_debate_event('debate_move', b1);
  perform public.notify_debate_event('debate_move', b1);
  perform t.as_user(t.id(7));
  perform public.set_debate_move(b1, true);
  perform public.notify_debate_event('debate_move', b1);
  perform t.eq('one a day per answer', t.inbox(t.id(2), format('type = ''debate_move'' and debate_answer_id = %L', b1)), '1');
  perform t.eq('first mover is named', t.inbox(t.id(2), format('type = ''debate_move'' and actor_id = %L', t.id(6))), '1');
end $$;
reset role;
update public.notifications set created_at = created_at - interval '2 days' where type = 'debate_move';
set role authenticated;
do $$
declare b1 uuid := current_setting('t.b1')::uuid;
begin
  perform t.as_user(t.id(7));
  perform public.notify_debate_event('debate_move', b1);
  perform t.eq('another day another notification', t.inbox(t.id(2), 'type = ''debate_move'''), '2');
  -- 곧바로 거두면 안 읽은 알림도 거둔다. 아직 눌러 둔 채면 그대로다
  perform t.as_user(t.id(7));
  perform public.retract_debate_notification('debate_move', b1);
  perform t.eq('still moved keeps it', t.inbox(t.id(2), 'type = ''debate_move'''), '2');
  perform t.as_user(t.id(7));
  perform public.set_debate_move(b1, false);
  perform public.retract_debate_notification('debate_move', b1);
  perform t.eq('quick undo retracts', t.inbox(t.id(2), 'type = ''debate_move'''), '1');
  -- 이틀 전 알림은 거두지 않는다
  perform t.as_user(t.id(6));
  perform public.set_debate_move(b1, false);
  perform public.retract_debate_notification('debate_move', b1);
  perform t.eq('old one stays', t.inbox(t.id(2), 'type = ''debate_move'''), '1');
end $$;
-- 읽은 알림은 거두지 않는다
do $$
declare b1 uuid := current_setting('t.b1')::uuid;
begin
  perform t.as_user(t.id(7));
  perform public.set_debate_move(b1, true);
  perform public.notify_debate_event('debate_move', b1);
  perform t.as_user(t.id(2));
  update public.notifications set read_at = now() where user_id = t.id(2) and type = 'debate_move';
  perform t.as_user(t.id(7));
  perform public.set_debate_move(b1, false);
  perform public.retract_debate_notification('debate_move', b1);
  perform t.eq('read one stays', t.inbox(t.id(2), 'type = ''debate_move'''), '2');
end $$;

-- ── 숨긴 답으로는 알리지 않는다 ─
do $$
declare d uuid := current_setting('t.d')::uuid; f2 uuid;
begin
  perform t.as_user(t.id(6));
  f2 := public.add_debate_answer(d, null, 'question', 'F의 답', null);
  perform set_config('t.f2', f2::text, false);
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(f2, true);
  perform t.as_user(t.id(6));
  perform public.notify_debate_event('debate_answer', f2);
  perform t.eq('hidden answer is silent', to_jsonb(t.real_count('notifications', format('debate_answer_id = %L', f2))), '0');
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(f2, false);
end $$;

-- ── 받은 사람이 볼 수 없게 되면 가린다(지우지 않는다) ─
do $$
declare fr uuid := current_setting('t.fr')::uuid;
begin
  -- 숨긴 답글의 알림은 답 쓴 사람에게 보이지 않고, 숨김을 풀면 돌아온다
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(fr, true);
  perform t.eq('hidden reply notification is hidden', t.inbox(t.id(2), format('debate_answer_id = %L', fr)), '0');
  perform t.eq('row is kept', to_jsonb(t.real_count('notifications', format('debate_answer_id = %L', fr))), '1');
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(fr, false);
  perform t.eq('unhidden comes back', t.inbox(t.id(2), format('debate_answer_id = %L', fr)), '1');
end $$;

-- 자리만 남은 답(답글이 있어 본문만 지운 답)의 알림은 보이지 않는다
do $$
declare b1 uuid := current_setting('t.b1')::uuid;
begin
  perform t.as_user(t.id(2));
  perform public.delete_debate_answer(b1);
  perform t.eq('placeholder answer notification is hidden', t.inbox(t.id(1), format('debate_answer_id = %L', b1)), '0');
  perform t.eq('placeholder row is kept', to_jsonb(t.real_count('notifications', format('debate_answer_id = %L and type = ''debate_answer''', b1))), '1');
end $$;

-- ── 정리: 답한 사람들에게, 발제자 제외 ─
do $$
declare d uuid := current_setting('t.d')::uuid;
begin
  perform t.as_user(t.id(2));
  perform set_config('t.b2', public.add_debate_answer(d, null, 'agree', 'B의 둘째 답', null)::text, false);
  perform public.add_debate_answer(d, 1::smallint, 'agree', 'B의 셋째 답', null);
  -- 열려 있는 토론은 정리 알림이 없다
  perform t.as_user(t.id(1));
  perform public.notify_debate_event('debate_summary', d);
  perform t.eq('open debate is silent', to_jsonb(t.real_count('notifications', 'type = ''debate_summary''')), '0');
  perform public.set_debate_summary(d, '정리', '{}');
  -- 발제자만 알린다
  perform t.as_user(t.id(2));
  perform public.notify_debate_event('debate_summary', d);
  perform t.eq('only the owner announces', to_jsonb(t.real_count('notifications', 'type = ''debate_summary''')), '0');
  perform t.as_user(t.id(1));
  perform public.notify_debate_event('debate_summary', d);
  perform public.notify_debate_event('debate_summary', d);
  -- B는 답이 여럿이어도 한 번, F는 답이 있어 받고, P는 표시만 눌렀으니 받지 않는다
  perform t.eq('answerer B once', t.inbox(t.id(2), format('type = ''debate_summary'' and debate_id = %L and actor_id = %L', d, t.id(1))), '1');
  perform t.eq('answerer F', t.inbox(t.id(6), 'type = ''debate_summary'''), '1');
  perform t.eq('mover only P', t.inbox(t.id(7), 'type = ''debate_summary'''), '0');
  perform t.eq('owner excluded', t.inbox(t.id(1), 'type = ''debate_summary'''), '0');
  perform t.eq('summary rows', to_jsonb(t.real_count('notifications', 'type = ''debate_summary''')), '2');
  -- 닫힌 채로는 거두지 못하고, 남이 거두지도 못한다
  perform t.as_user(t.id(1));
  perform public.retract_debate_notification('debate_summary', d);
  perform t.eq('closed keeps them', to_jsonb(t.real_count('notifications', 'type = ''debate_summary''')), '2');
  perform public.clear_debate_summary(d);
  perform t.as_user(t.id(2));
  perform public.retract_debate_notification('debate_summary', d);
  perform t.eq('others cannot retract', to_jsonb(t.real_count('notifications', 'type = ''debate_summary''')), '2');
  -- 다시 열면 거두고, 다시 정리하면 다시 알린다
  perform t.as_user(t.id(1));
  perform public.retract_debate_notification('debate_summary', d);
  perform t.eq('reopen retracts', to_jsonb(t.real_count('notifications', 'type = ''debate_summary''')), '0');
  perform public.set_debate_summary(d, '다시 정리', '{}');
  perform public.notify_debate_event('debate_summary', d);
  perform t.eq('closing again announces again', to_jsonb(t.real_count('notifications', 'type = ''debate_summary''')), '2');
end $$;

-- ── 안 읽은 알림 표시도 가려진 알림을 세지 않는다 ─
do $$
begin
  perform t.as_user(t.id(6));
  update public.notifications set read_at = now() where user_id = t.id(6) and type <> 'debate_summary';
  perform t.eq('unread summary lights the dot', to_jsonb(public.has_unread_notifications()), 'true');
end $$;
-- 친구가 아니게 되면 토론을 볼 수 없으니 그 토론의 알림도 보이지 않는다
reset role;
delete from public.friends where user_id = t.id(6) and friend_id = t.id(1);
set role authenticated;
do $$
begin
  perform t.eq('former friend sees no debate notifications', t.inbox(t.id(6), 'debate_id is not null'), '0');
  perform t.eq('former friend has no dot', to_jsonb(public.has_unread_notifications()), 'false');
  perform t.eq('rows are kept', to_jsonb(t.real_count('notifications', format('user_id = %L and type = ''debate_summary''', t.id(6)))), '1');
  -- 볼 수 없는 토론에서는 새 알림도 만들지 못한다
  perform t.as_user(t.id(6));
  perform public.notify_debate_event('debate_answer', current_setting('t.f2')::uuid);
  perform t.eq('former friend cannot notify', to_jsonb(t.real_count('notifications', format('debate_answer_id = %L', current_setting('t.f2')))), '0');
end $$;

-- ── 탈퇴 유예 중인 사람은 알리지 못한다 ─
reset role;
insert into public.account_deletions (user_id, purge_after) values (t.id(7), now() + interval '14 days');
set role authenticated;
do $$
begin
  perform t.as_user(t.id(7));
  if t.err(format('select public.notify_debate_event(%L, %L)', 'debate_move', current_setting('t.b2'))) = 'ok' then
    raise exception 'pending account must not notify';
  end if;
end $$;
reset role;
delete from public.account_deletions where user_id = t.id(7);
set role authenticated;

-- ── 지우면 알림도 사라진다 ─
do $$
declare d uuid := current_setting('t.d')::uuid; b2 uuid := current_setting('t.b2')::uuid;
begin
  perform t.as_user(t.id(2));
  perform public.notify_debate_event('debate_answer', b2);
  perform t.eq('b2 notified', to_jsonb(t.real_count('notifications', format('debate_answer_id = %L', b2))), '1');
  perform public.delete_debate_answer(b2);
  perform t.eq('deleted answer takes its notification', to_jsonb(t.real_count('notifications', format('debate_answer_id = %L', b2))), '0');
  perform t.as_user(t.id(1));
  perform public.delete_debate(d);
  perform t.eq('deleted debate takes all of them', to_jsonb(t.real_count('notifications', 'debate_id is not null or debate_answer_id is not null')), '0');
end $$;
