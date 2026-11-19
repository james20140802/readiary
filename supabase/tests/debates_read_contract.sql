-- 문장 토론: 읽기 RPC(토론 한 편·단락 페이지·답글·누른 사람·목록). 준비는 debates-fixture.sql.
-- 닉네임: A=u1, B=u2, F=u6, P=u7.

do $$
declare fn text; v_bad text;
begin
  foreach fn in array array[
    'public.get_debate(uuid)',
    'public.get_debate_answers(uuid,smallint,boolean,integer,integer)',
    'public.get_debate_replies(uuid)',
    'public.get_debate_movers(uuid)',
    'public.list_debates(boolean,timestamp with time zone,integer)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'anon must not execute %', fn; end if;
    if not has_function_privilege('authenticated', fn, 'execute') then raise exception 'authenticated must execute %', fn; end if;
  end loop;
  select string_agg(p.proname, ',') into v_bad from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('get_debate', 'get_debate_answers', 'get_debate_replies', 'get_debate_movers', 'list_debates')
    and (not p.prosecdef or not coalesce(p.proconfig @> array['search_path=""'], false));
  if v_bad is not null then raise exception 'must be definer with empty search_path: %', v_bad; end if;
end $$;

set role authenticated;

-- 준비: 밑줄 1(0..5)에 B differ · F agree · A differ, 밑줄 2에 B agree · F agree, 문장 전체에 P question
do $$
declare d uuid;
begin
  perform t.as_user(t.id(1));
  d := public.create_debate(t.id(101), '가까워질수록?', '[{"start":0,"end":5,"prompt":"왜 경계일까요?"},{"start":17,"end":25}]'::jsonb);
  perform set_config('t.d', d::text, false);
  perform t.as_user(t.id(2));
  perform set_config('t.b1', public.add_debate_answer(d, 1::smallint, 'differ', '사라지는 건 상상 속의 상대뿐이에요.', t.id(201))::text, false);
  perform set_config('t.b2', public.add_debate_answer(d, 2::smallint, 'agree', 'B의 둘째 답', null)::text, false);
  perform t.as_user(t.id(6));
  perform set_config('t.f1', public.add_debate_answer(d, 1::smallint, 'agree', 'F의 답', null)::text, false);
  perform set_config('t.f2', public.add_debate_answer(d, 2::smallint, 'agree', 'F의 둘째 답', null)::text, false);
  perform t.as_user(t.id(1));
  perform set_config('t.a1', public.add_debate_answer(d, 1::smallint, 'differ', 'A의 답', null)::text, false);
  perform t.as_user(t.id(7));
  perform set_config('t.p0', public.add_debate_answer(d, null, 'question', 'P의 질문', null)::text, false);

  -- 생각이 바뀌었어요: B의 답 ← A·F·P, F의 답 ← B·A
  perform t.as_user(t.id(1)); perform public.set_debate_move(current_setting('t.b1')::uuid, true);
  perform public.set_debate_move(current_setting('t.f1')::uuid, true);
  perform t.as_user(t.id(6)); perform public.set_debate_move(current_setting('t.b1')::uuid, true);
  perform t.as_user(t.id(7)); perform public.set_debate_move(current_setting('t.b1')::uuid, true);
  perform t.as_user(t.id(2)); perform public.set_debate_move(current_setting('t.f1')::uuid, true);

  -- 답글 3개(F 2, A 1)
  perform t.as_user(t.id(6));
  perform public.add_debate_reply(current_setting('t.b1')::uuid, '첫 답글');
  perform public.add_debate_reply(current_setting('t.b1')::uuid, '둘째 답글');
  perform t.as_user(t.id(1));
  perform public.add_debate_reply(current_setting('t.b1')::uuid, '셋째 답글');
end $$;

-- ── 토론 한 편 ─
do $$
declare
  g jsonb;
  s1 jsonb;
  s2 jsonb;
  w jsonb;
begin
  perform t.as_user(t.id(3));
  perform t.eq('stranger', to_jsonb(t.err(format('select public.get_debate(%L)', current_setting('t.d')))), '"not_found"');

  perform t.as_user(t.id(2));
  g := public.get_debate(current_setting('t.d')::uuid);
  perform t.eq('owner', (g -> 'owner') - 'profile_image', jsonb_build_object('id', t.id(1), 'nickname', 'u1', 'tag', '0001', 'is_friend', true, 'is_me', false));
  perform t.eq('quote', g -> 'quote', to_jsonb('경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.'::text));
  perform t.eq('book', jsonb_build_array(g -> 'book_title', g -> 'book_author', g -> 'page_from', g -> 'page_to'), '["에로스의 종말","한병철",42,null]');
  perform t.eq('source visible to friend', g -> 'source_entry_id', to_jsonb(t.id(101)));
  perform t.eq('open', jsonb_build_array(g -> 'closed_at', g -> 'summary', g -> 'can_answer'), '[null,null,true]');
  perform t.eq('totals', g -> 'totals', '{"agree":3,"differ":2,"question":1,"moved_people":4}');
  perform t.eq('section order', (select jsonb_agg(x -> 'position') from jsonb_array_elements(g -> 'sections') x), '[1,2,null]');

  s1 := g -> 'sections' -> 0;
  perform t.eq('s1 range+stats', jsonb_build_array(s1 -> 'start', s1 -> 'end', s1 -> 'count', s1 -> 'agree', s1 -> 'differ', s1 -> 'question'), '[0,5,3,1,2,0]');
  perform t.eq('s1 prompt', s1 -> 'prompt', '"왜 경계일까요?"');
  perform t.eq('s2 no prompt', g -> 'sections' -> 1 -> 'prompt', 'null');
  perform t.eq('s1 picks', (select jsonb_agg(x -> 'id') from jsonb_array_elements(s1 -> 'picks') x),
    jsonb_build_array(current_setting('t.b1'), current_setting('t.f1')));
  perform t.eq('s1 kinds', s1 -> 'pick_kinds', '["most_moved","other_side"]');
  perform t.eq('pick 1 fields', (s1 -> 'picks' -> 0) - 'created_at' - 'replies' - 'id',
    jsonb_build_object(
      'author', jsonb_build_object('id', t.id(2), 'nickname', 'u2', 'tag', '0001', 'profile_image', null, 'is_friend', false, 'is_me', true, 'active', true),
      'stance', 'differ', 'body', '사라지는 건 상상 속의 상대뿐이에요.',
      'evidence', jsonb_build_object('quote', '사랑은 가지는 것이 아니라 하는 것이다.', 'book_title', '소유냐 존재냐', 'book_author', '에리히 프롬',
        'page_from', 96, 'page_to', 97, 'entry_id', t.id(201)),
      'moved_count', 3, 'moved_by_me', false, 'reply_count', 3,
      'hidden', false, 'deleted', false, 'edited', false, 'reported_by_me', false));
  perform t.eq('first two replies', (select jsonb_agg(x -> 'body') from jsonb_array_elements(s1 -> 'picks' -> 0 -> 'replies') x), '["첫 답글","둘째 답글"]');
  perform t.eq('F is not my friend', s1 -> 'picks' -> 1 -> 'author' -> 'is_friend', 'false');
  perform t.eq('I moved F', s1 -> 'picks' -> 1 -> 'moved_by_me', 'true');

  s2 := g -> 'sections' -> 1;
  perform t.eq('same stance picks are plain', s2 -> 'pick_kinds', '["plain","plain"]');
  perform t.eq('s2 first is earliest', s2 -> 'picks' -> 0 -> 'id', to_jsonb(current_setting('t.b2')));

  w := g -> 'sections' -> 2;
  perform t.eq('whole', jsonb_build_array(w -> 'start', w -> 'end', w -> 'count', w -> 'question'), '[null,null,1,1]');
  perform t.eq('no moves means plain', w -> 'pick_kinds', '["plain"]');

  -- 근거 기록 링크: 남에게는 볼 권한이 없으면(비공개 기록) 숨긴다
  perform t.as_user(t.id(6));
  g := public.get_debate(current_setting('t.d')::uuid);
  perform t.eq('private evidence link hidden', g -> 'sections' -> 0 -> 'picks' -> 0 -> 'evidence' -> 'entry_id', 'null');
  perform t.eq('evidence quote still shown', g -> 'sections' -> 0 -> 'picks' -> 0 -> 'evidence' -> 'quote', '"사랑은 가지는 것이 아니라 하는 것이다."');
end $$;

-- ── 단락 페이지·답글·누른 사람 ─
do $$
declare p jsonb;
begin
  perform t.as_user(t.id(6));
  p := public.get_debate_answers(current_setting('t.d')::uuid, 1::smallint, false, 0, 2);
  perform t.eq('page 1', (select jsonb_agg(x -> 'id') from jsonb_array_elements(p -> 'answers') x),
    jsonb_build_array(current_setting('t.b1'), current_setting('t.f1')));
  perform t.eq('next', p -> 'next', '2');
  p := public.get_debate_answers(current_setting('t.d')::uuid, 1::smallint, false, 2, 2);
  perform t.eq('page 2', (select jsonb_agg(x -> 'id') from jsonb_array_elements(p -> 'answers') x), jsonb_build_array(current_setting('t.a1')));
  perform t.eq('last page', p -> 'next', 'null');
  p := public.get_debate_answers(current_setting('t.d')::uuid, null, true, 0, 10);
  perform t.eq('whole page', jsonb_array_length(p -> 'answers'), '1');

  perform t.eq('replies', (select jsonb_agg(x -> 'body') from jsonb_array_elements(public.get_debate_replies(current_setting('t.b1')::uuid)) x),
    '["첫 답글","둘째 답글","셋째 답글"]');
  perform t.eq('movers only for author', to_jsonb(t.err(format('select public.get_debate_movers(%L)', current_setting('t.b1')))), '"not_found"');
  perform t.as_user(t.id(2));
  perform t.eq('movers have tags', (select bool_and(x ->> 'tag' = '0001') from jsonb_array_elements(public.get_debate_movers(current_setting('t.b1')::uuid)) x), 'true');
  perform t.eq('movers', (select jsonb_agg(x -> 'nickname' order by x ->> 'nickname') from jsonb_array_elements(public.get_debate_movers(current_setting('t.b1')::uuid)) x),
    '["u1","u6","u7"]');
  perform t.as_user(t.id(3));
  perform t.eq('stranger page', to_jsonb(t.err(format('select public.get_debate_answers(%L, 1::smallint, false, 0, 5)', current_setting('t.d')))), '"not_found"');
  perform t.eq('stranger replies', to_jsonb(t.err(format('select public.get_debate_replies(%L)', current_setting('t.b1')))), '"not_found"');
end $$;

-- ── 숨긴 답: 남에게는 집계와 목록에서 빠지고, 쓴 사람에게는 hidden으로 보인다 ─
do $$
begin
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(current_setting('t.f2')::uuid, true);
  perform t.as_user(t.id(2));
  perform t.eq('hidden excluded', public.get_debate(current_setting('t.d')::uuid) -> 'sections' -> 1 -> 'count', '1');
  perform t.eq('others page excludes hidden', jsonb_array_length(public.get_debate_answers(current_setting('t.d')::uuid, 2::smallint, false, 0, 10) -> 'answers'), '1');
  -- 세지 않는 답 중 보는 사람에게 보이는 것(숨긴 답)은 extra로 알려 이어 불러올 수 있게 한다
  perform t.eq('others have no extra', public.get_debate(current_setting('t.d')::uuid) -> 'sections' -> 1 -> 'extra', '0');
  perform t.as_user(t.id(1));
  perform t.eq('owner sees hidden as extra', public.get_debate(current_setting('t.d')::uuid) -> 'sections' -> 1 -> 'extra', '1');
  perform t.as_user(t.id(6));
  perform t.eq('author sees hidden as extra', public.get_debate(current_setting('t.d')::uuid) -> 'sections' -> 1 -> 'extra', '1');
  perform t.eq('author sees hidden flag', (select x -> 'hidden' from jsonb_array_elements(
      public.get_debate_answers(current_setting('t.d')::uuid, 2::smallint, false, 0, 10) -> 'answers') x
    where x ->> 'id' = current_setting('t.f2')), 'true');
  perform t.as_user(t.id(1));
  perform public.set_debate_answer_hidden(current_setting('t.f2')::uuid, false);
end $$;

-- ── 신고한 답은 내 응답에 표시 ─
do $$
begin
  perform t.as_user(t.id(6));
  perform public.report_debate(current_setting('t.d')::uuid, current_setting('t.a1')::uuid, 'spam', null);
  perform t.eq('reported_by_me', (select x -> 'reported_by_me' from jsonb_array_elements(
      public.get_debate_answers(current_setting('t.d')::uuid, 1::smallint, false, 0, 10) -> 'answers') x
    where x ->> 'id' = current_setting('t.a1')), 'true');
end $$;

-- ── 목록 ─
do $$
declare l jsonb; it jsonb;
begin
  perform t.as_user(t.id(2));
  l := public.list_debates(false, null, 10);
  perform t.eq('B sees one open', jsonb_array_length(l -> 'items'), '1');
  it := l -> 'items' -> 0;
  perform t.eq('item', jsonb_build_array(it -> 'id', it -> 'question', it -> 'answer_count', it -> 'underlines', it -> 'top_line'),
    jsonb_build_array(current_setting('t.d'), '가까워질수록?', 6, '[{"start":0,"end":5},{"start":17,"end":25}]'::jsonb,
      '{"nickname":"u2","body":"사라지는 건 상상 속의 상대뿐이에요.","kind":"most_moved"}'::jsonb));
  perform t.eq('next none', l -> 'next_before', 'null');
  perform t.eq('B sees no closed', jsonb_array_length(public.list_debates(true, null, 10) -> 'items'), '0');
  perform t.as_user(t.id(3));
  perform t.eq('C sees none', jsonb_array_length(public.list_debates(false, null, 10) -> 'items'), '0');
end $$;

-- ── 원래 기록을 비공개로: 친구에게 원래 기록 링크가 사라지고 발제자에게는 남는다 ─
reset role;
update public.entries set is_private = true where id = t.id(101);
set role authenticated;
do $$
begin
  perform t.as_user(t.id(2));
  perform t.eq('source hidden', public.get_debate(current_setting('t.d')::uuid) -> 'source_entry_id', 'null');
  perform t.as_user(t.id(1));
  perform t.eq('owner keeps source', public.get_debate(current_setting('t.d')::uuid) -> 'source_entry_id', to_jsonb(t.id(101)));
  perform t.eq('owner is_me', public.get_debate(current_setting('t.d')::uuid) -> 'owner' -> 'is_me', 'true');
end $$;

-- ── 탈퇴 유예: P의 답은 본문이 가려지고 집계·누름에서 빠진다 ─
reset role;
insert into public.account_deletions (user_id, purge_after) values (t.id(7), now() + interval '14 days');
set role authenticated;
do $$
declare g jsonb; x jsonb;
begin
  perform t.as_user(t.id(2));
  g := public.get_debate(current_setting('t.d')::uuid);
  perform t.eq('pending excluded from totals', g -> 'totals', '{"agree":3,"differ":2,"question":0,"moved_people":3}');
  perform t.eq('pending whole count', g -> 'sections' -> 2 -> 'count', '0');
  perform t.eq('pending mover dropped', g -> 'sections' -> 0 -> 'picks' -> 0 -> 'moved_count', '2');
  x := public.get_debate_answers(current_setting('t.d')::uuid, null, true, 0, 10) -> 'answers' -> 0;
  perform t.eq('pending placeholder', jsonb_build_array(x -> 'author' -> 'active', x -> 'author' -> 'nickname', x -> 'body'), '[false,null,null]');
end $$;
reset role;
delete from public.account_deletions where user_id = t.id(7);

-- ── 정리 뒤: 정리와 짚은 답, 지운 짚은 답, 목록의 정리된 쪽 ─
set role authenticated;
do $$
declare g jsonb; l jsonb;
begin
  perform t.as_user(t.id(1));
  perform public.set_debate_summary(current_setting('t.d')::uuid, E'환상을 비우는 쪽으로 모였어요.\n둘째 줄', array[current_setting('t.b1')::uuid, current_setting('t.f1')::uuid]);
  perform t.as_user(t.id(6));
  perform public.delete_debate_answer(current_setting('t.f1')::uuid);
  perform t.as_user(t.id(2));
  g := public.get_debate(current_setting('t.d')::uuid);
  perform t.eq('can_answer closed', g -> 'can_answer', 'false');
  perform t.eq('summary body', g -> 'summary' -> 'body', to_jsonb(E'환상을 비우는 쪽으로 모였어요.\n둘째 줄'::text));
  perform t.eq('pins', g -> 'summary' -> 'pins',
    jsonb_build_array(
      jsonb_build_object('answer_id', current_setting('t.b1'), 'nickname', 'u2', 'first_line', '사라지는 건 상상 속의 상대뿐이에요.', 'deleted', false),
      jsonb_build_object('answer_id', current_setting('t.f1'), 'nickname', null, 'first_line', null, 'deleted', true)));
  l := public.list_debates(true, null, 10);
  perform t.eq('closed list', jsonb_build_array(jsonb_array_length(l -> 'items'), l -> 'items' -> 0 -> 'summary_first_line'),
    '[1,"환상을 비우는 쪽으로 모였어요."]');
  perform t.eq('open list empty', jsonb_array_length(public.list_debates(false, null, 10) -> 'items'), '0');
end $$;

-- ── 목록 페이지: 내 토론 + 친구 토론, 최근 활동 순 ─
do $$
declare l jsonb; d2 uuid; d3 uuid;
begin
  perform t.as_user(t.id(1));
  d2 := public.create_debate(t.id(103), '둘째', '[]'::jsonb);
  perform pg_sleep(0.01); -- PGlite 시계는 밀리초 단위다
  perform t.as_user(t.id(2));
  d3 := public.create_debate(t.id(201), '셋째(B의 토론)', '[]'::jsonb);
  perform t.as_user(t.id(6));
  -- F는 A의 친구지만 B의 친구가 아니다: A의 토론만 보인다
  perform t.eq('F sees only A', jsonb_array_length(public.list_debates(false, null, 10) -> 'items'), '1');
  perform t.as_user(t.id(1));
  l := public.list_debates(false, null, 1);
  perform t.eq('A page size', jsonb_array_length(l -> 'items'), '1');
  perform t.eq('A has more', (l -> 'next_before') is not null and l -> 'next_before' <> 'null', 'true');
  l := public.list_debates(false, (l ->> 'next_before')::timestamptz, 10);
  perform t.eq('A second page', jsonb_array_length(l -> 'items'), '1');
end $$;
reset role;
