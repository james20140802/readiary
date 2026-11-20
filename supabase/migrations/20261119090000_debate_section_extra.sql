-- 문장 토론: 단락마다 세지 않지만 보는 사람에게 보이는 답 수(extra)를 알린다.
-- 숨긴 답은 집계(count)와 대표 답에서 빠지므로, 남은 답이 둘 이하이면 화면이 나머지를 불러올 길이 없었다.
-- 그 때문에 토론 주인이 숨긴 답의 "숨김 풀기"에, 작성자가 숨겨진 자기 답에 닿지 못했다.
-- 함수 모양(인자·반환형)과 권한은 그대로다 — create or replace는 기존 grant를 유지한다.

create or replace function public.get_debate(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  d record;
  v_sections jsonb := '[]'::jsonb;
  v_sec record;
  v_ranked jsonb;
  v_first jsonb;
  v_second jsonb;
  v_other boolean;
  v_stats record;
  v_visible int;
  v_picks jsonb;
  v_kinds jsonb;
  v_summary jsonb;
begin
  if not public.can_view_debate(p_id) then raise exception 'not_found'; end if;
  select * into d from public.debates where id = p_id;

  for v_sec in
    select u.position, u.start_at, u.end_at, u.prompt from public.debate_underlines u where u.debate_id = p_id
    union all
    select null::smallint, null::int, null::int, null::text
    order by 1 nulls last
  loop
    -- 세는 답을 대표 답 순서(생각이 바뀐 수, 먼저 남긴 순)로 줄 세운다.
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'stance', c.stance, 'mc', c.mc)
             order by c.mc desc, c.seq), '[]'::jsonb)
      into v_ranked
    from (
      select a.id, a.stance, public.debate_moved_count(a.id) as mc, a.seq
      from public.debate_answers a
      where a.debate_id = p_id and a.parent_id is null and a.deleted_at is null and a.hidden_at is null
        and public.is_account_active(a.user_id)
        and a.underline_position is not distinct from v_sec.position
    ) c;

    select count(*)::int as n,
           count(*) filter (where x ->> 'stance' = 'agree')::int as agree,
           count(*) filter (where x ->> 'stance' = 'differ')::int as differ,
           count(*) filter (where x ->> 'stance' = 'question')::int as question
      into v_stats from jsonb_array_elements(v_ranked) x;

    -- 보는 사람에게 보이는 답 수(숨긴 내 답·주인에게 보이는 숨긴 답·자리만 남은 답·떠난 사람의 답 포함).
    -- 세는 답과의 차이(extra)가 있으면 화면이 나머지를 이어 불러올 수 있다.
    select count(*)::int into v_visible
    from public.debate_answers a
    where a.debate_id = p_id and a.parent_id is null
      and a.underline_position is not distinct from v_sec.position
      and public.debate_can_see_answer(a.debate_id, a.user_id, a.hidden_at);

    v_picks := '[]'::jsonb;
    v_kinds := '[]'::jsonb;
    v_first := v_ranked -> 0;
    if v_first is not null then
      v_picks := jsonb_build_array(public.debate_answer_json((v_first ->> 'id')::uuid, true));
      v_kinds := jsonb_build_array(case when (v_first ->> 'mc')::int > 0 then 'most_moved' else 'plain' end);
      -- 둘째: 첫째와 입장이 다른 답 중 첫째, 없으면 첫째 다음 답
      select x into v_second from jsonb_array_elements(v_ranked) with ordinality as t(x, ord)
      where x ->> 'stance' <> v_first ->> 'stance' order by ord limit 1;
      v_other := v_second is not null;
      if not v_other then v_second := v_ranked -> 1; end if;
      if v_second is not null then
        v_picks := v_picks || jsonb_build_array(public.debate_answer_json((v_second ->> 'id')::uuid, true));
        v_kinds := v_kinds || jsonb_build_array(case when v_other then 'other_side' else 'plain' end);
      end if;
    end if;

    v_sections := v_sections || jsonb_build_array(jsonb_build_object(
      'position', v_sec.position, 'start', v_sec.start_at, 'end', v_sec.end_at, 'prompt', v_sec.prompt,
      'count', v_stats.n, 'agree', v_stats.agree, 'differ', v_stats.differ, 'question', v_stats.question,
      'extra', greatest(v_visible - v_stats.n, 0),
      'picks', v_picks, 'pick_kinds', v_kinds
    ));
  end loop;

  if d.summary is not null then
    select jsonb_build_object('body', d.summary, 'pins', coalesce(jsonb_agg(
      jsonb_build_object(
        'answer_id', pin.id,
        'nickname', case when vis then (select nickname from public.profiles where id = a.user_id) end,
        'first_line', case when vis then split_part(a.body, E'\n', 1) end,
        'deleted', not vis
      ) order by pin.ord), '[]'::jsonb))
    into v_summary
    from unnest(d.summary_answer_ids) with ordinality as pin(id, ord)
    left join public.debate_answers a on a.id = pin.id
    cross join lateral (select coalesce(
      a.deleted_at is null and public.is_account_active(a.user_id)
      and public.debate_can_see_answer(a.debate_id, a.user_id, a.hidden_at), false) as vis) v;
  end if;

  return jsonb_build_object(
    'id', d.id,
    'owner', public.debate_person_json(d.user_id) - 'active',
    'quote', d.quote,
    'book_title', d.book_title,
    'book_author', d.book_author,
    'page_from', d.page_from,
    'page_to', d.page_to,
    'source_entry_id', case when d.user_id = v_uid or exists (
        select 1 from public.entries e where e.id = d.source_entry_id and not e.is_private
      ) then d.source_entry_id end,
    'question', d.question,
    'created_at', d.created_at,
    'closed_at', d.closed_at,
    'can_answer', d.closed_at is null,
    'summary', v_summary,
    'totals', public.debate_totals(p_id),
    'sections', v_sections
  );
end;
$$;
