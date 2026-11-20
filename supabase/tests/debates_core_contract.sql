-- 문장 토론: 발제(문장 고정·밑줄 검증)와 볼 수 있는가. 준비는 debates-fixture.sql.

-- ── 권한과 정의 ─────────────────────────────────────────────
do $$
declare
  tbl text;
  fn text;
  v_bad text;
begin
  foreach tbl in array array['public.debates', 'public.debate_underlines'] loop
    if has_table_privilege('anon', tbl, 'select') then raise exception 'anon must not read %', tbl; end if;
    -- 읽기도 RPC로만: 테이블을 직접 읽으면 RPC가 가리는 것(떠난 사람의 본문, 누른 사람 등)이 새어 나간다
    if has_table_privilege('authenticated', tbl, 'select') then raise exception 'authenticated must not read % directly', tbl; end if;
    if has_table_privilege('authenticated', tbl, 'insert') or has_table_privilege('authenticated', tbl, 'update')
       or has_table_privilege('authenticated', tbl, 'delete') then
      raise exception 'writes to % go through RPCs only', tbl;
    end if;
    if not has_table_privilege('service_role', tbl, 'select') then raise exception 'service_role needs %', tbl; end if;
    if not (select relrowsecurity from pg_class where oid = tbl::regclass) then raise exception 'RLS off on %', tbl; end if;
  end loop;

  foreach fn in array array[
    'public.can_view_debate(uuid)',
    'public.create_debate(uuid,text,jsonb)',
    'public.update_debate_question(uuid,text)',
    'public.delete_debate(uuid)',
    'public.count_entry_debates(uuid)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;

  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('create_debate', 'update_debate_question', 'delete_debate', 'count_entry_debates')
    and (not p.prosecdef or not coalesce(p.proconfig @> array['search_path=""'], false));
  if v_bad is not null then raise exception 'must be definer with empty search_path: %', v_bad; end if;
end $$;

-- ── 발제: 문장·책·쪽수를 고정하고 밑줄을 함께 넣는다 ─
set role authenticated;
do $$
declare
  d uuid;
  r record;
begin
  perform t.as_user(t.id(1));
  -- 밑줄마다 짧은 물음을 선택으로 붙인다(앞뒤 공백을 걷고, 비면 없음)
  d := public.create_debate(t.id(101), '가까워질수록 상대를 덜 궁금해하게 되는 걸까요?',
    '[{"start":17,"end":25,"prompt":"  환상이 사라지면 무엇이 남을까요?  "},{"start":0,"end":5,"prompt":"   "}]'::jsonb);
  perform set_config('t.debate', d::text, false);

  select quote, book_title, book_author, page_from, page_to, question, source_entry_id, user_id
    into r from t.debates where id = d;
  perform t.eq('quote fixed', to_jsonb(r.quote), to_jsonb('경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.'::text));
  perform t.eq('book fixed', to_jsonb(array[r.book_title, r.book_author]), to_jsonb(array['에로스의 종말', '한병철']));
  perform t.eq('pages fixed', to_jsonb(array[r.page_from, r.page_to]), '[42, null]');
  perform t.eq('owner', to_jsonb(r.user_id), to_jsonb(t.id(1)));
  perform t.eq('source', to_jsonb(r.source_entry_id), to_jsonb(t.id(101)));
  perform t.eq('underlines',
    (select jsonb_agg(jsonb_build_array(position, start_at, end_at, prompt) order by position)
       from t.debate_underlines where debate_id = d),
    '[[1,0,5,null],[2,17,25,"환상이 사라지면 무엇이 남을까요?"]]');
  perform t.eq('long prompt', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q',
    jsonb_build_array(jsonb_build_object('start', 0, 'end', 1, 'prompt', repeat('가', 101)))))), '"invalid_underlines"');
  perform t.eq('prompt not text', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q',
    '[{"start":0,"end":1,"prompt":3}]'))), '"invalid_underlines"');

  -- 밑줄 0개도 된다
  perform public.create_debate(t.id(101), '밑줄 없이', '[]'::jsonb);
end $$;

-- ── 발제 검증 ─
do $$
begin
  perform t.as_user(t.id(1));
  perform t.eq('not my entry', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(201), 'q', '[]'))), '"not_found"');
  perform t.eq('note only', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(102), 'q', '[]'))), '"no_quote"');
  perform t.eq('four underlines', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q',
    '[{"start":0,"end":1},{"start":3,"end":4},{"start":6,"end":7},{"start":9,"end":10}]'))), '"invalid_underlines"');
  perform t.eq('overlap', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q',
    '[{"start":0,"end":5},{"start":5,"end":8}]'))), '"invalid_underlines"');
  perform t.eq('out of range', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q',
    '[{"start":30,"end":99}]'))), '"invalid_underlines"');
  perform t.eq('reversed', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q',
    '[{"start":5,"end":2}]'))), '"invalid_underlines"');
  perform t.eq('not an array', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q',
    '{"start":0}'))), '"invalid_underlines"');
  perform t.eq('empty question', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), '   ', '[]'))), '"invalid_question"');
  perform t.eq('long question', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), repeat('가', 501), '[]'))), '"invalid_question"');
end $$;

-- ── 코드 포인트 기준 위치: 이모지가 섞여도 같은 글자를 가리킨다 ─
do $$
declare d uuid;
begin
  perform t.as_user(t.id(1));
  d := public.create_debate(t.id(103), '이모지', '[{"start":2,"end":3}]'::jsonb);
  perform t.eq('code point substring',
    (select to_jsonb(substr(x.quote, u.start_at + 1, u.end_at - u.start_at + 1))
       from t.debates x join t.debate_underlines u on u.debate_id = x.id where x.id = d),
    '"가나"');
  -- 마지막 글자까지가 범위 안이다(🙂 가나다 = 5글자, 0..4)
  perform public.create_debate(t.id(103), '끝까지', '[{"start":4,"end":4}]'::jsonb);
  perform t.eq('past end', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(103), 'q', '[{"start":4,"end":5}]'))), '"invalid_underlines"');
end $$;

-- ── 볼 수 있는가: A 본인과 A의 친구만 ─
do $$
declare d uuid := current_setting('t.debate')::uuid;
begin
  perform t.as_user(t.id(1)); perform t.eq('owner sees', to_jsonb(public.can_view_debate(d)), 'true');
  perform t.as_user(t.id(2)); perform t.eq('friend B sees', to_jsonb(public.can_view_debate(d)), 'true');
  perform t.eq('B cannot read table', to_jsonb(t.err('select count(*) from public.debates')), '"42501"');
  perform t.as_user(t.id(6)); perform t.eq('friend F sees', to_jsonb(public.can_view_debate(d)), 'true');
  perform t.as_user(t.id(3)); perform t.eq('stranger C', to_jsonb(public.can_view_debate(d)), 'false');
  perform t.eq('C cannot read underlines', to_jsonb(t.err('select count(*) from public.debate_underlines')), '"42501"');
  -- 직접 쓰기는 권한이 없다
  perform t.as_user(t.id(1));
  perform t.eq('no direct insert', to_jsonb(t.err(format(
    'insert into t.debates(user_id, quote, book_title, question) values (%L, %L, %L, %L)', t.id(1), 'x', 'y', 'z'))), '"42501"');
  perform t.eq('no direct update', to_jsonb(t.err(format('update public.debates set question = %L where id = %L', 'x', d))), '"42501"');
  perform t.eq('no direct delete', to_jsonb(t.err(format('delete from public.debates where id = %L', d))), '"42501"');
end $$;
reset role;

-- anon은 함수도 부르지 못한다
set role anon;
do $$
begin
  perform t.as_anon();
  perform t.eq('anon cannot ask', to_jsonb(t.err(format('select public.can_view_debate(%L)', current_setting('t.debate')))), '"42501"');
end $$;
reset role;

-- ── 탈퇴 유예: 유예 중인 친구는 쓰지 못하고, 유예 중인 발제자의 토론은 친구에게 안 보인다 ─
insert into public.account_deletions (user_id, purge_after) values (t.id(7), now() + interval '14 days');
set role authenticated;
do $$
begin
  perform t.as_user(t.id(7));
  perform t.eq('pending cannot open', to_jsonb(t.err(format('select public.create_debate(%L, %L, %L)', t.id(101), 'q', '[]')) <> 'ok'), 'true');
end $$;
reset role;
delete from public.account_deletions where user_id = t.id(7);
insert into public.account_deletions (user_id, purge_after) values (t.id(1), now() + interval '14 days');
set role authenticated;
do $$
begin
  perform t.as_user(t.id(2));
  perform t.eq('pending owner hidden', to_jsonb(public.can_view_debate(current_setting('t.debate')::uuid)), 'false');
end $$;
reset role;
delete from public.account_deletions where user_id = t.id(1);

-- ── 질문 고치기·지우기는 발제자만, 원래 기록과의 관계 ─
set role authenticated;
do $$
declare d uuid := current_setting('t.debate')::uuid;
begin
  perform t.as_user(t.id(2));
  perform t.eq('B cannot edit', to_jsonb(t.err(format('select public.update_debate_question(%L, %L)', d, 'x'))), '"not_found"');
  perform t.eq('B cannot delete', to_jsonb(t.err(format('select public.delete_debate(%L)', d))), '"not_found"');
  perform t.eq('B counts own entry only', to_jsonb(public.count_entry_debates(t.id(101))), '0');

  perform t.as_user(t.id(1));
  perform public.update_debate_question(d, '고친 질문');
  perform t.eq('question edited', to_jsonb((select question from t.debates where id = d)), '"고친 질문"');
  perform t.eq('empty edit', to_jsonb(t.err(format('select public.update_debate_question(%L, %L)', d, ''))), '"invalid_question"');
  perform t.eq('A counts', to_jsonb(public.count_entry_debates(t.id(101))), '2');
end $$;
reset role;

-- 원래 기록을 고쳐도 토론 문장은 그대로
update public.entries set quote = '바뀐 문장' where id = t.id(101);
select t.eq('quote stays', to_jsonb((select quote from t.debates where id = current_setting('t.debate')::uuid)),
  to_jsonb('경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.'::text));

-- 발제자가 지운다
set role authenticated;
do $$
declare d uuid;
begin
  perform t.as_user(t.id(1));
  d := public.create_debate(t.id(103), '지울 토론', '[]'::jsonb);
  perform public.delete_debate(d);
  perform t.eq('deleted', to_jsonb(t.real_count('debates', format('id = %L', d))), '0');
end $$;
reset role;

-- 원래 기록을 지우면 토론과 밑줄도 사라진다
delete from public.entries where id = t.id(101);
select t.eq('cascade debates', to_jsonb(t.real_count('debates', format('source_entry_id = %L or id = %L', t.id(101), current_setting('t.debate')))), '0');
select t.eq('cascade underlines', to_jsonb(t.real_count('debate_underlines', format('debate_id = %L', current_setting('t.debate')))), '0');
