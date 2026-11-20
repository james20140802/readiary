-- 문장 토론: 정리(닫기·다시 열기)·숨기기·신고. 준비는 debates-fixture.sql.

do $$
declare fn text;
begin
  if has_table_privilege('authenticated', 'public.debate_reports', 'select')
     or has_table_privilege('authenticated', 'public.debate_reports', 'insert')
     or has_table_privilege('anon', 'public.debate_reports', 'select') then
    raise exception 'reports are not readable or writable directly';
  end if;
  if not has_table_privilege('service_role', 'public.debate_reports', 'select') then raise exception 'service_role reads reports'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.debate_reports'::regclass) then raise exception 'RLS off on reports'; end if;
  foreach fn in array array[
    'public.set_debate_summary(uuid,text,uuid[])',
    'public.clear_debate_summary(uuid)',
    'public.set_debate_answer_hidden(uuid,boolean)',
    'public.report_debate(uuid,uuid,text,text)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;
end $$;

set role authenticated;

do $$
declare d uuid;
begin
  perform t.as_user(t.id(1));
  d := public.create_debate(t.id(101), '질문', '[{"start":0,"end":5}]'::jsonb);
  perform set_config('t.d', d::text, false);
  perform set_config('t.d2', public.create_debate(t.id(103), '다른 토론', '[]'::jsonb)::text, false);
  perform t.as_user(t.id(2));
  perform set_config('t.b1', public.add_debate_answer(d, 1::smallint, 'differ', 'B의 답', null)::text, false);
  perform set_config('t.b2', public.add_debate_answer(d, null, 'agree', 'B의 둘째 답', null)::text, false);
  perform t.as_user(t.id(6));
  perform set_config('t.f1', public.add_debate_answer(d, 1::smallint, 'agree', 'F의 답', null)::text, false);
  perform set_config('t.fr', public.add_debate_reply(current_setting('t.b1')::uuid, 'F의 답글')::text, false);
end $$;

-- ── 숨기기: 발제자만, 숨긴 답은 쓴 사람과 발제자에게만 보인다 ─
do $$
declare b1 uuid := current_setting('t.b1')::uuid;
begin
  perform t.as_user(t.id(2));
  perform t.eq('B cannot hide', to_jsonb(t.err(format('select public.set_debate_answer_hidden(%L, true)', b1))), '"not_found"');
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(b1, true);
  perform t.eq('owner still sees hidden', (select count(*)::int from jsonb_array_elements(public.get_debate_answers(current_setting('t.d')::uuid, 1::smallint, false, 0, 30) -> 'answers') x where x ->> 'id' = b1::text), '1');
  perform t.as_user(t.id(2));
  perform t.eq('author still sees hidden', (select count(*)::int from jsonb_array_elements(public.get_debate_answers(current_setting('t.d')::uuid, 1::smallint, false, 0, 30) -> 'answers') x where x ->> 'id' = b1::text), '1');
  perform t.as_user(t.id(6));
  perform t.eq('others do not see hidden', (select count(*)::int from jsonb_array_elements(public.get_debate_answers(current_setting('t.d')::uuid, 1::smallint, false, 0, 30) -> 'answers') x where x ->> 'id' = b1::text), '0');
  perform t.eq('others cannot move hidden', to_jsonb(t.err(format('select public.set_debate_move(%L, true)', b1))), '"not_found"');
  perform t.eq('others cannot reply hidden', to_jsonb(t.err(format('select public.add_debate_reply(%L, %L)', b1, 'x'))), '"not_found"');
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(b1, false);
  perform t.as_user(t.id(6));
  perform t.eq('unhidden is back', (select count(*)::int from jsonb_array_elements(public.get_debate_answers(current_setting('t.d')::uuid, 1::smallint, false, 0, 30) -> 'answers') x where x ->> 'id' = b1::text), '1');
  -- 답글도 숨길 수 있다
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(current_setting('t.fr')::uuid, true);
  perform t.as_user(t.id(2));
  perform t.eq('hidden reply', (select count(*)::int from jsonb_array_elements(public.get_debate_replies(current_setting('t.b1')::uuid)) x where x ->> 'id' = current_setting('t.fr')), '0');
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(current_setting('t.fr')::uuid, false);
end $$;

-- ── 신고 ─
do $$
declare
  d uuid := current_setting('t.d')::uuid;
  b1 uuid := current_setting('t.b1')::uuid;
begin
  perform t.as_user(t.id(6));
  perform public.report_debate(d, b1, 'abuse', '  메모  ');
  perform t.eq('report saved', to_jsonb(t.real_count('debate_reports', format('answer_id = %L and memo = %L', b1, '메모'))), '1');
  perform t.eq('already reported', to_jsonb(t.err(format('select public.report_debate(%L, %L, %L, null)', d, b1, 'spam'))), '"already_reported"');
  perform public.report_debate(d, null, 'other', null);
  perform t.eq('debate report saved', to_jsonb(t.real_count('debate_reports', 'answer_id is null')), '1');
  perform t.eq('debate reported twice', to_jsonb(t.err(format('select public.report_debate(%L, null, %L, null)', d, 'spam'))), '"already_reported"');
  perform t.eq('bad reason', to_jsonb(t.err(format('select public.report_debate(%L, %L, %L, null)', d, current_setting('t.f1'), 'boring'))), '"invalid_reason"');
  perform t.eq('long memo', to_jsonb(t.err(format('select public.report_debate(%L, %L, %L, %L)', d, current_setting('t.b2'), 'other', repeat('가', 501)))), '"invalid_reason"');
  perform t.eq('answer from other debate', to_jsonb(t.err(format('select public.report_debate(%L, %L, %L, null)',
    current_setting('t.d2'), b1, 'spam'))), '"not_found"');
  perform t.eq('reports not readable', to_jsonb(t.err('select count(*) from public.debate_reports')), '"42501"');
  perform t.as_user(t.id(3));
  perform t.eq('stranger cannot report', to_jsonb(t.err(format('select public.report_debate(%L, %L, %L, null)', d, b1, 'spam'))), '"not_found"');
end $$;

-- ── 정리: 발제자만, 짚기 0~2개(같은 토론의 보이는 답) ─
do $$
declare
  d uuid := current_setting('t.d')::uuid;
  b1 uuid := current_setting('t.b1')::uuid;
  f1 uuid := current_setting('t.f1')::uuid;
begin
  perform t.as_user(t.id(2));
  perform t.eq('B cannot summarize', to_jsonb(t.err(format('select public.set_debate_summary(%L, %L, %L)', d, 'x', '{}'))), '"not_found"');

  perform t.as_user(t.id(1));
  perform t.eq('empty summary', to_jsonb(t.err(format('select public.set_debate_summary(%L, %L, %L)', d, ' ', '{}'))), '"invalid_summary"');
  perform t.eq('three pins', to_jsonb(t.err(format('select public.set_debate_summary(%L, %L, %L)', d, '정리',
    array[b1, f1, current_setting('t.b2')::uuid]))), '"invalid_pins"');
  perform t.eq('reply pin', to_jsonb(t.err(format('select public.set_debate_summary(%L, %L, %L)', d, '정리',
    array[current_setting('t.fr')::uuid]))), '"invalid_pins"');
  perform public.set_debate_summary(d, '  환상을 비우는 쪽으로 모였어요.  ', array[b1, f1]);
  perform t.eq('closed with summary', (select to_jsonb(array[summary, (closed_at is not null)::text, array_length(summary_answer_ids, 1)::text])
    from t.debates where id = d), '["환상을 비우는 쪽으로 모였어요.","true","2"]');
end $$;

-- ── 닫힌 토론: 새 답·답글·고치기는 막고, 지우기와 생각이 바뀌었어요는 된다 ─
do $$
declare
  d uuid := current_setting('t.d')::uuid;
  b1 uuid := current_setting('t.b1')::uuid;
  closed_at_before timestamptz;
begin
  perform t.as_user(t.id(2));
  perform t.eq('no new answer', to_jsonb(t.err(format('select public.add_debate_answer(%L, null, %L, %L, null)', d, 'agree', 'x'))), '"closed"');
  perform t.eq('no new reply', to_jsonb(t.err(format('select public.add_debate_reply(%L, %L)', current_setting('t.f1'), 'x'))), '"closed"');
  perform t.eq('no edit', to_jsonb(t.err(format('select public.edit_debate_answer(%L, %L, %L)', b1, 'agree', 'x'))), '"closed"');
  perform t.eq('move still works', to_jsonb(public.set_debate_move(current_setting('t.f1')::uuid, true)), '1');
  perform public.delete_debate_answer(current_setting('t.b2')::uuid);
  perform t.eq('delete still works', to_jsonb(t.real_count('debate_answers', format('id = %L', current_setting('t.b2')))), '0');

  -- 정리 고치기는 닫힌 시각을 바꾸지 않는다
  perform t.as_user(t.id(1));
  select closed_at into closed_at_before from t.debates where id = d;
  perform public.set_debate_summary(d, '고친 정리', array[b1]);
  perform t.eq('closed_at kept', to_jsonb((select closed_at = closed_at_before from t.debates where id = d)), 'true');

  -- 다시 열면 고칠 수 있다
  perform public.clear_debate_summary(d);
  perform t.eq('reopened', (select to_jsonb(array[(summary is null)::text, (closed_at is null)::text, coalesce(array_length(summary_answer_ids, 1), 0)::text])
    from t.debates where id = d), '["true","true","0"]');
  perform t.as_user(t.id(2));
  perform public.edit_debate_answer(b1, 'agree', '다시 열린 뒤 고침');
  perform t.as_user(t.id(6));
  perform t.eq('B cannot reopen', to_jsonb(t.err(format('select public.clear_debate_summary(%L)', d))), '"not_found"');
end $$;
reset role;
