-- 문장 토론: 답·답글·생각이 바뀌었어요. 준비는 debates-fixture.sql.

do $$
declare
  tbl text;
  fn text;
  v_bad text;
begin
  foreach tbl in array array['public.debate_answers', 'public.debate_moves'] loop
    if has_table_privilege('anon', tbl, 'select') then raise exception 'anon must not read %', tbl; end if;
    if not has_table_privilege('authenticated', tbl, 'select') then raise exception 'authenticated reads %', tbl; end if;
    if has_table_privilege('authenticated', tbl, 'insert') or has_table_privilege('authenticated', tbl, 'update')
       or has_table_privilege('authenticated', tbl, 'delete') then
      raise exception 'writes to % go through RPCs only', tbl;
    end if;
    if not (select relrowsecurity from pg_class where oid = tbl::regclass) then raise exception 'RLS off on %', tbl; end if;
  end loop;
  foreach fn in array array[
    'public.add_debate_answer(uuid,smallint,text,text,uuid)',
    'public.add_debate_reply(uuid,text)',
    'public.edit_debate_answer(uuid,text,text)',
    'public.delete_debate_answer(uuid)',
    'public.set_debate_move(uuid,boolean)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;
  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('add_debate_answer', 'add_debate_reply', 'edit_debate_answer', 'delete_debate_answer', 'set_debate_move')
    and (not p.prosecdef or not coalesce(p.proconfig @> array['search_path=""'], false));
  if v_bad is not null then raise exception 'must be definer with empty search_path: %', v_bad; end if;
end $$;

set role authenticated;

-- A가 발제: 밑줄 1 = 경계와 문턱이(0..5), 밑줄 2 = 타자에 대한 환상(17..25)
do $$
begin
  perform t.as_user(t.id(1));
  perform set_config('t.d', public.create_debate(t.id(101), '질문', '[{"start":0,"end":5},{"start":17,"end":25}]'::jsonb)::text, false);
end $$;

-- ── 답 ─
do $$
declare
  d uuid := current_setting('t.d')::uuid;
  a uuid;
  r record;
begin
  perform t.as_user(t.id(2));
  a := public.add_debate_answer(d, 2::smallint, 'differ', '  사라지는 건 상상 속의 상대뿐이에요.  ', null);
  perform set_config('t.a', a::text, false);
  select underline_position, stance, body, user_id, parent_id into r from public.debate_answers where id = a;
  perform t.eq('answer row', to_jsonb(array[r.underline_position::text, r.stance, r.body, r.user_id::text]),
    to_jsonb(array['2', 'differ', '사라지는 건 상상 속의 상대뿐이에요.', t.id(2)::text]));

  -- 문장 전체에 답하기
  perform set_config('t.whole', public.add_debate_answer(d, null, 'question', '여기서 타자는 연인만일까요?', null)::text, false);
  perform t.eq('whole sentence', to_jsonb((select underline_position is null from public.debate_answers where id = current_setting('t.whole')::uuid)), 'true');

  perform t.eq('missing underline', to_jsonb(t.err(format('select public.add_debate_answer(%L, 3::smallint, %L, %L, null)', d, 'agree', 'x'))), '"invalid_underline"');
  perform t.eq('no stance', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, null, %L, null)', d, 'x'))), '"invalid_stance"');
  perform t.eq('bad stance', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, %L, %L, null)', d, 'love', 'x'))), '"invalid_stance"');
  perform t.eq('empty body', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, %L, %L, null)', d, 'agree', '  '))), '"invalid_body"');
  perform t.eq('long body', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, %L, %L, null)', d, 'agree', repeat('가', 2001)))), '"invalid_body"');

  perform t.as_user(t.id(3));
  perform t.eq('stranger cannot answer', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, %L, %L, null)', d, 'agree', 'x'))), '"not_found"');
  perform t.eq('stranger sees no answers', to_jsonb(t.seen_count('debate_answers')), '0');

  perform t.as_user(t.id(6));
  perform t.eq('F sees B answer', to_jsonb(t.seen_count('debate_answers', format('id = %L', a))), '1');
  perform t.eq('no direct insert', to_jsonb(t.err(format(
    'insert into public.debate_answers(debate_id, user_id, stance, body) values (%L, %L, %L, %L)', d, t.id(6), 'agree', 'x'))), '"42501"');
end $$;

-- ── 근거 기록: 비공개 기록도 붙이되 문장·책·쪽수만 고정한다 ─
do $$
declare
  d uuid := current_setting('t.d')::uuid;
  a uuid;
  r record;
begin
  perform t.as_user(t.id(2));
  a := public.add_debate_answer(d, 1::smallint, 'agree', '근거와 함께', t.id(201));
  select evidence_quote, evidence_book_title, evidence_book_author, evidence_page_from, evidence_page_to, evidence_entry_id
    into r from public.debate_answers where id = a;
  perform t.eq('evidence copy', to_jsonb(array[r.evidence_quote, r.evidence_book_title, r.evidence_book_author,
      r.evidence_page_from::text, r.evidence_page_to::text, r.evidence_entry_id::text]),
    to_jsonb(array['사랑은 가지는 것이 아니라 하는 것이다.', '소유냐 존재냐', '에리히 프롬', '96', '97', t.id(201)::text]));
  perform t.eq('note never copied', to_jsonb(t.real_count('debate_answers', format(
    'concat_ws(%L, body, evidence_quote, evidence_book_title, evidence_book_author) like %L', '|', '%비밀%'))), '0');
  perform t.eq('others entry', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, %L, %L, %L)', d, 'agree', 'x', t.id(101)))), '"invalid_evidence"');
  perform t.eq('note-only entry', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, %L, %L, %L)', d, 'agree', 'x', t.id(202)))), '"invalid_evidence"');
end $$;

-- ── 답글: 1단만, 입장 없음 ─
do $$
declare
  a uuid := current_setting('t.a')::uuid;
  rp uuid;
begin
  perform t.as_user(t.id(6));
  rp := public.add_debate_reply(a, '그렇게 보면 비우는 거네요.');
  perform set_config('t.reply', rp::text, false);
  perform t.eq('reply has no stance', to_jsonb((select stance is null from public.debate_answers where id = rp)), 'true');
  perform t.eq('reply same debate', to_jsonb((select debate_id = current_setting('t.d')::uuid from public.debate_answers where id = rp)), 'true');
  perform t.eq('no nested reply', to_jsonb(t.err(format('select public.add_debate_reply(%L, %L)', rp, 'x'))), '"nested_reply"');
  perform t.eq('empty reply', to_jsonb(t.err(format('select public.add_debate_reply(%L, %L)', a, ''))), '"invalid_body"');
  perform t.as_user(t.id(3));
  perform t.eq('stranger reply', to_jsonb(t.err(format('select public.add_debate_reply(%L, %L)', a, 'x'))), '"not_found"');
end $$;

-- ── 생각이 바뀌었어요 ─
do $$
declare a uuid := current_setting('t.a')::uuid;
begin
  perform t.as_user(t.id(6));
  perform t.eq('move on', to_jsonb(public.set_debate_move(a, true)), '1');
  perform t.eq('move idempotent', to_jsonb(public.set_debate_move(a, true)), '1');
  perform t.as_user(t.id(1));
  perform t.eq('owner moves too', to_jsonb(public.set_debate_move(a, true)), '2');
  perform t.as_user(t.id(6));
  perform t.eq('move off', to_jsonb(public.set_debate_move(a, false)), '1');
  perform t.as_user(t.id(2));
  perform t.eq('own answer', to_jsonb(t.err(format('select public.set_debate_move(%L, true)', a))), '"own_answer"');
  perform t.eq('reply cannot be moved', to_jsonb(t.err(format('select public.set_debate_move(%L, true)', current_setting('t.reply')))), '"not_found"');
  perform t.as_user(t.id(3));
  perform t.eq('stranger move', to_jsonb(t.err(format('select public.set_debate_move(%L, true)', a))), '"not_found"');
end $$;

-- ── 고치기·지우기 ─
do $$
declare
  a uuid := current_setting('t.a')::uuid;
  w uuid := current_setting('t.whole')::uuid;
  r record;
begin
  perform t.as_user(t.id(6));
  perform t.eq('not mine', to_jsonb(t.err(format('select public.edit_debate_answer(%L, %L, %L)', a, 'agree', 'x'))), '"not_found"');

  perform t.as_user(t.id(2));
  perform public.edit_debate_answer(a, 'agree', '고친 답');
  select stance, body, edited_at is not null as edited into r from public.debate_answers where id = a;
  perform t.eq('edited', to_jsonb(array[r.stance, r.body, r.edited::text]), '["agree","고친 답","true"]');
  perform t.eq('edit needs stance', to_jsonb(t.err(format('select public.edit_debate_answer(%L, null, %L)', a, 'x'))), '"invalid_stance"');

  perform t.as_user(t.id(6));
  perform public.edit_debate_answer(current_setting('t.reply')::uuid, null, '고친 답글');
  perform t.eq('reply stance stays null', to_jsonb(t.err(format('select public.edit_debate_answer(%L, %L, %L)', current_setting('t.reply'), 'agree', 'x'))), '"invalid_stance"');

  -- 답글이 있는 답을 지우면 자리만 남는다
  perform t.as_user(t.id(2));
  perform public.delete_debate_answer(a);
  select deleted_at is not null as gone, body, evidence_quote into r from public.debate_answers where id = a;
  perform t.eq('soft deleted', to_jsonb(array[r.gone::text, r.body, r.evidence_quote]), '["true", null, null]');
  perform t.eq('reply survives', to_jsonb(t.real_count('debate_answers', format('id = %L', current_setting('t.reply')))), '1');
  perform t.eq('deleted cannot be moved', to_jsonb(t.err(format('select public.set_debate_move(%L, true)', a))), '"not_found"');
  perform t.eq('deleted cannot be replied', to_jsonb(t.err(format('select public.add_debate_reply(%L, %L)', a, 'x'))), '"not_found"');
  perform t.eq('deleted cannot be edited', to_jsonb(t.err(format('select public.edit_debate_answer(%L, %L, %L)', a, 'agree', 'x'))), '"not_found"');

  -- 답글 없는 답은 행이 사라진다
  perform public.delete_debate_answer(w);
  perform t.eq('hard deleted', to_jsonb(t.real_count('debate_answers', format('id = %L', w))), '0');

  -- 답글도 지운다
  perform t.as_user(t.id(6));
  perform public.delete_debate_answer(current_setting('t.reply')::uuid);
  perform t.eq('reply deleted', to_jsonb(t.real_count('debate_answers', format('id = %L', current_setting('t.reply')))), '0');
end $$;

-- ── 탈퇴 유예 중에는 답하지 못한다 ─
reset role;
insert into public.account_deletions (user_id, purge_after) values (t.id(7), now() + interval '14 days');
set role authenticated;
do $$
begin
  perform t.as_user(t.id(7));
  perform t.eq('pending cannot answer', to_jsonb(t.err(format('select public.add_debate_answer(%L, 1::smallint, %L, %L, null)',
    current_setting('t.d'), 'agree', 'x')) <> 'ok'), 'true');
end $$;
reset role;

-- 근거로 붙인 기록이 지워져도 답의 사본은 남고 연결만 끊긴다
delete from public.entries where id = t.id(201);
select t.eq('evidence copy survives entry deletion', to_jsonb(t.real_count('debate_answers',
  'evidence_quote is not null and evidence_entry_id is null')), '1');
