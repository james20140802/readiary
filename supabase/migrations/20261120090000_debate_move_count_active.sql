-- 문장 토론: 생각이 바뀌었어요를 누를 때 돌려주는 수에서 탈퇴 유예 중인 사람의 누름을 뺀다.
-- 읽기(debate_moved_count)는 이미 빼고 세는데 누를 때만 모든 행을 세서, 다른 사람이 누르면
-- 떠난 사람의 누름이 다시 셈에 들어간 수가 새로고침 전까지 보였다. 같은 셈 함수를 쓴다.
-- 함수 모양(인자·반환형)과 권한은 그대로다 — create or replace는 기존 grant를 유지한다.

create or replace function public.set_debate_move(p_answer_id uuid, p_on boolean)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_row record;
  v_count int;
begin
  perform public.assert_account_active();
  select id, debate_id, user_id, hidden_at into v_row from public.debate_answers
  where id = p_answer_id and parent_id is null and deleted_at is null;
  if not found or not public.debate_can_see_answer(v_row.debate_id, v_row.user_id, v_row.hidden_at) then
    raise exception 'not_found';
  end if;
  if v_row.user_id = v_uid then raise exception 'own_answer'; end if;
  if coalesce(p_on, false) then
    insert into public.debate_moves (answer_id, user_id) values (p_answer_id, v_uid) on conflict do nothing;
  else
    delete from public.debate_moves where answer_id = p_answer_id and user_id = v_uid;
  end if;
  v_count := public.debate_moved_count(p_answer_id);
  return v_count;
end;
$$;
