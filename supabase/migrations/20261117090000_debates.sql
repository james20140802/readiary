-- 문장 토론. 발제자가 자기 기록의 문장을 고정해 밑줄(0~3개)과 질문을 붙이고, 발제자의 친구들이 답한다.
-- 설계: docs/superpowers/specs/2026-11-17-sentence-debate-design.md
-- 볼 수 있는지는 can_view_debate 한 곳에서 정한다(발제자 본인 또는 발제자의 친구, 발제자는 활성 계정).
-- 모든 쓰기는 security definer RPC로만 한다. 테이블에는 읽기 권한만 준다.
-- 새 테이블·함수만 더하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다.
begin;

-- ── 발제(토론) ───────────────────────────────────────────────
-- quote·book_*·page_*는 발제한 순간의 사본이다. 원래 기록을 고쳐도 바뀌지 않는다.
-- 원래 기록을 지우면 토론도 지운다(source_entry_id on delete cascade).
create table public.debates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_entry_id uuid references public.entries (id) on delete cascade,
  quote text not null,
  book_title text not null,
  book_author text,
  page_from integer,
  page_to integer,
  question text not null,
  summary text,
  summary_answer_ids uuid[] not null default '{}',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index debates_user_created_idx on public.debates (user_id, created_at desc);
create index debates_source_entry_idx on public.debates (source_entry_id) where source_entry_id is not null;

-- 밑줄: 고정한 문장 안의 코드 포인트 위치, 끝 포함. 올린 뒤에는 고치지 않는다.
create table public.debate_underlines (
  debate_id uuid not null references public.debates (id) on delete cascade,
  position smallint not null check (position between 1 and 3),
  start_at integer not null check (start_at >= 0),
  end_at integer not null,
  primary key (debate_id, position),
  check (end_at >= start_at)
);

alter table public.debates enable row level security;
alter table public.debate_underlines enable row level security;

revoke all on public.debates from public, anon, authenticated;
revoke all on public.debate_underlines from public, anon, authenticated;
grant select on public.debates to authenticated;
grant select on public.debate_underlines to authenticated;
grant all on public.debates to service_role;
grant all on public.debate_underlines to service_role;

-- 볼 수 있는가: 발제자 본인이거나 발제자의 친구. 발제자가 탈퇴 유예 중이면 아무도 보지 못한다.
create function public.can_view_debate(p_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.debates d
    where d.id = p_id
      and public.is_account_active(d.user_id)
      and (d.user_id = (select auth.uid()) or public.is_friend_with(d.user_id))
  );
$$;
revoke all on function public.can_view_debate(uuid) from public, anon;
grant execute on function public.can_view_debate(uuid) to authenticated, service_role;

create policy debates_select_viewable on public.debates
  for select to authenticated using (public.can_view_debate(id));
create policy debate_underlines_select_viewable on public.debate_underlines
  for select to authenticated using (public.can_view_debate(debate_id));

-- 질문 검증: 앞뒤 공백을 걷은 1~500자.
create function public.debate_clean_question(p_question text)
returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_question, ''));
begin
  if char_length(v) = 0 or char_length(v) > 500 then
    raise exception 'invalid_question';
  end if;
  return v;
end;
$$;
revoke all on function public.debate_clean_question(text) from public, anon, authenticated;

-- 발제: 내 기록의 문장을 고정하고 밑줄을 함께 넣는다.
-- p_underlines = [{"start":int,"end":int}, ...] 0~3개, 문장 안, 겹침 없음. 저장 순서는 시작 위치 순.
create function public.create_debate(p_entry_id uuid, p_question text, p_underlines jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_entry record;
  v_question text;
  v_len int;
  v_id uuid;
  v_item jsonb;
  v_prev_end int := -1;
  v_pos smallint := 0;
  v_start int;
  v_end int;
begin
  perform public.assert_account_active();

  select e.quote, e.from_page, e.to_page, b.title, b.author
    into v_entry
  from public.entries e
  join public.user_books ub on ub.id = e.user_book_id
  join public.books b on b.id = ub.book_id
  where e.id = p_entry_id and ub.user_id = v_uid;
  if not found then raise exception 'not_found'; end if;
  if v_entry.quote is null or btrim(v_entry.quote) = '' then raise exception 'no_quote'; end if;

  v_question := public.debate_clean_question(p_question);
  v_len := char_length(v_entry.quote);

  if p_underlines is null or jsonb_typeof(p_underlines) <> 'array' or jsonb_array_length(p_underlines) > 3 then
    raise exception 'invalid_underlines';
  end if;

  insert into public.debates (user_id, source_entry_id, quote, book_title, book_author, page_from, page_to, question)
  values (v_uid, p_entry_id, v_entry.quote, v_entry.title, v_entry.author, v_entry.from_page, v_entry.to_page, v_question)
  returning id into v_id;

  for v_item in
    select x from jsonb_array_elements(p_underlines) x
    order by case when jsonb_typeof(x -> 'start') = 'number' then (x ->> 'start')::numeric end nulls first
  loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item -> 'start') <> 'number' or jsonb_typeof(v_item -> 'end') <> 'number'
       or (v_item ->> 'start')::numeric <> trunc((v_item ->> 'start')::numeric)
       or (v_item ->> 'end')::numeric <> trunc((v_item ->> 'end')::numeric) then
      raise exception 'invalid_underlines';
    end if;
    v_start := (v_item ->> 'start')::int;
    v_end := (v_item ->> 'end')::int;
    if v_start < 0 or v_end < v_start or v_end >= v_len or v_start <= v_prev_end then
      raise exception 'invalid_underlines';
    end if;
    v_prev_end := v_end;
    v_pos := v_pos + 1;
    insert into public.debate_underlines (debate_id, position, start_at, end_at)
    values (v_id, v_pos, v_start, v_end);
  end loop;

  return v_id;
end;
$$;

create function public.update_debate_question(p_id uuid, p_question text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_question text;
begin
  perform public.assert_account_active();
  if not exists (select 1 from public.debates where id = p_id and user_id = (select auth.uid())) then
    raise exception 'not_found';
  end if;
  v_question := public.debate_clean_question(p_question);
  update public.debates set question = v_question, updated_at = now() where id = p_id;
end;
$$;

create function public.delete_debate(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_account_active();
  delete from public.debates where id = p_id and user_id = (select auth.uid());
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- 내 기록으로 연 토론 수(기록 메뉴와 삭제 확인창). 남의 기록은 0이다.
create function public.count_entry_debates(p_entry_id uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.debates
  where source_entry_id = p_entry_id and user_id = (select auth.uid());
$$;

revoke all on function public.create_debate(uuid, text, jsonb) from public, anon;
revoke all on function public.update_debate_question(uuid, text) from public, anon;
revoke all on function public.delete_debate(uuid) from public, anon;
revoke all on function public.count_entry_debates(uuid) from public, anon;
grant execute on function public.create_debate(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.update_debate_question(uuid, text) to authenticated, service_role;
grant execute on function public.delete_debate(uuid) to authenticated, service_role;
grant execute on function public.count_entry_debates(uuid) to authenticated, service_role;

-- ── 답·답글 ─────────────────────────────────────────────────
-- 답: parent_id가 없고 입장이 있다. 밑줄(underline_position)이 없으면 문장 전체에 대한 답이다.
-- 답글: parent_id가 있고 입장이 없다. 1단만 — 부모가 답인지는 RPC가 확인한다.
-- 지운 답에 답글이 있으면 자리(deleted_at)만 남기고 본문과 근거를 비운다.
-- evidence_*는 답에 붙인 내 기록의 사본(문장·책·쪽수만). 원래 기록이 지워져도 사본은 남고 연결만 끊긴다.
create table public.debate_answers (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references public.debates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  underline_position smallint,
  stance text check (stance in ('agree', 'differ', 'question')),
  body text,
  parent_id uuid,
  evidence_quote text,
  evidence_book_title text,
  evidence_book_author text,
  evidence_page_from integer,
  evidence_page_to integer,
  evidence_entry_id uuid references public.entries (id) on delete set null,
  hidden_at timestamptz,
  deleted_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, debate_id),
  foreign key (parent_id, debate_id) references public.debate_answers (id, debate_id) on delete cascade,
  foreign key (debate_id, underline_position) references public.debate_underlines (debate_id, position) on delete cascade,
  check ((parent_id is null) = (stance is not null)),
  check (parent_id is null or underline_position is null),
  check (deleted_at is not null or body is not null)
);
create index debate_answers_section_idx on public.debate_answers (debate_id, underline_position, created_at);
create index debate_answers_parent_idx on public.debate_answers (parent_id) where parent_id is not null;
create index debate_answers_user_idx on public.debate_answers (user_id);
create index debate_answers_evidence_idx on public.debate_answers (evidence_entry_id) where evidence_entry_id is not null;

-- 생각이 바뀌었어요: 답 하나에 사람마다 한 번. 자기 답과 답글에는 없다(RPC가 막는다).
create table public.debate_moves (
  answer_id uuid not null references public.debate_answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);
create index debate_moves_user_idx on public.debate_moves (user_id);

alter table public.debate_answers enable row level security;
alter table public.debate_moves enable row level security;
revoke all on public.debate_answers from public, anon, authenticated;
revoke all on public.debate_moves from public, anon, authenticated;
grant select on public.debate_answers to authenticated;
grant select on public.debate_moves to authenticated;
grant all on public.debate_answers to service_role;
grant all on public.debate_moves to service_role;

create policy debate_answers_select_viewable on public.debate_answers
  for select to authenticated using (public.can_view_debate(debate_id));
create policy debate_moves_select_viewable on public.debate_moves
  for select to authenticated using (
    exists (select 1 from public.debate_answers a where a.id = answer_id and public.can_view_debate(a.debate_id))
  );

-- 본문 검증: 앞뒤 공백을 걷은 1~2000자.
create function public.debate_clean_body(p_body text)
returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_body, ''));
begin
  if char_length(v) = 0 or char_length(v) > 2000 then
    raise exception 'invalid_body';
  end if;
  return v;
end;
$$;
revoke all on function public.debate_clean_body(text) from public, anon, authenticated;

-- 답할 수 있는 토론인가: 볼 수 있고(아니면 not_found) 닫히지 않았다(아니면 closed).
create function public.debate_assert_open(p_debate_id uuid)
returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_debate(p_debate_id) then raise exception 'not_found'; end if;
  if exists (select 1 from public.debates where id = p_debate_id and closed_at is not null) then
    raise exception 'closed';
  end if;
end;
$$;
revoke all on function public.debate_assert_open(uuid) from public, anon, authenticated;

create function public.add_debate_answer(
  p_debate_id uuid, p_underline smallint, p_stance text, p_body text, p_evidence_entry_id uuid
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text;
  v_ev_quote text;
  v_ev_title text;
  v_ev_author text;
  v_ev_from int;
  v_ev_to int;
  v_id uuid;
begin
  perform public.assert_account_active();
  perform public.debate_assert_open(p_debate_id);
  if p_stance is null or p_stance not in ('agree', 'differ', 'question') then raise exception 'invalid_stance'; end if;
  if p_underline is not null and not exists (
    select 1 from public.debate_underlines where debate_id = p_debate_id and position = p_underline
  ) then
    raise exception 'invalid_underline';
  end if;
  v_body := public.debate_clean_body(p_body);

  if p_evidence_entry_id is not null then
    select e.quote, e.from_page, e.to_page, b.title, b.author
      into v_ev_quote, v_ev_from, v_ev_to, v_ev_title, v_ev_author
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    join public.books b on b.id = ub.book_id
    where e.id = p_evidence_entry_id and ub.user_id = v_uid and nullif(btrim(e.quote), '') is not null;
    if not found then raise exception 'invalid_evidence'; end if;
  end if;

  insert into public.debate_answers (
    debate_id, user_id, underline_position, stance, body,
    evidence_quote, evidence_book_title, evidence_book_author, evidence_page_from, evidence_page_to, evidence_entry_id
  ) values (
    p_debate_id, v_uid, p_underline, p_stance, v_body,
    v_ev_quote, v_ev_title, v_ev_author, v_ev_from, v_ev_to, p_evidence_entry_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

create function public.add_debate_reply(p_answer_id uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_parent record;
  v_body text;
  v_id uuid;
begin
  perform public.assert_account_active();
  select id, debate_id, parent_id, deleted_at into v_parent from public.debate_answers where id = p_answer_id;
  if not found or v_parent.deleted_at is not null or not public.can_view_debate(v_parent.debate_id) then
    raise exception 'not_found';
  end if;
  if v_parent.parent_id is not null then raise exception 'nested_reply'; end if;
  perform public.debate_assert_open(v_parent.debate_id);
  v_body := public.debate_clean_body(p_body);
  insert into public.debate_answers (debate_id, user_id, parent_id, body)
  values (v_parent.debate_id, (select auth.uid()), p_answer_id, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

-- 고치기: 본인 것만. 답은 입장이 필요하고 답글은 입장이 없다.
create function public.edit_debate_answer(p_id uuid, p_stance text, p_body text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_row record;
  v_body text;
begin
  perform public.assert_account_active();
  select id, debate_id, parent_id into v_row from public.debate_answers
  where id = p_id and user_id = (select auth.uid()) and deleted_at is null;
  if not found or not public.can_view_debate(v_row.debate_id) then raise exception 'not_found'; end if;
  perform public.debate_assert_open(v_row.debate_id);
  if v_row.parent_id is null and (p_stance is null or p_stance not in ('agree', 'differ', 'question')) then
    raise exception 'invalid_stance';
  end if;
  if v_row.parent_id is not null and p_stance is not null then raise exception 'invalid_stance'; end if;
  v_body := public.debate_clean_body(p_body);
  update public.debate_answers set stance = p_stance, body = v_body, edited_at = now() where id = p_id;
end;
$$;

-- 지우기: 본인 것만, 정리된 뒤에도 된다. 답글이 남아 있는 답은 자리만 남긴다.
create function public.delete_debate_answer(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_row record;
begin
  perform public.assert_account_active();
  select id, parent_id into v_row from public.debate_answers
  where id = p_id and user_id = (select auth.uid()) and deleted_at is null;
  if not found then raise exception 'not_found'; end if;
  if v_row.parent_id is null and exists (select 1 from public.debate_answers where parent_id = p_id) then
    update public.debate_answers
    set deleted_at = now(), body = null, evidence_quote = null, evidence_book_title = null,
        evidence_book_author = null, evidence_page_from = null, evidence_page_to = null, evidence_entry_id = null
    where id = p_id;
  else
    delete from public.debate_answers where id = p_id;
  end if;
end;
$$;

-- 생각이 바뀌었어요 켜고 끄기. 정리된 뒤에도 된다. 그 답의 수를 돌려준다.
create function public.set_debate_move(p_answer_id uuid, p_on boolean)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_row record;
  v_count int;
begin
  perform public.assert_account_active();
  select id, debate_id, user_id into v_row from public.debate_answers
  where id = p_answer_id and parent_id is null and deleted_at is null;
  if not found or not public.can_view_debate(v_row.debate_id) then raise exception 'not_found'; end if;
  if v_row.user_id = v_uid then raise exception 'own_answer'; end if;
  if coalesce(p_on, false) then
    insert into public.debate_moves (answer_id, user_id) values (p_answer_id, v_uid) on conflict do nothing;
  else
    delete from public.debate_moves where answer_id = p_answer_id and user_id = v_uid;
  end if;
  select count(*)::int into v_count from public.debate_moves where answer_id = p_answer_id;
  return v_count;
end;
$$;

revoke all on function public.add_debate_answer(uuid, smallint, text, text, uuid) from public, anon;
revoke all on function public.add_debate_reply(uuid, text) from public, anon;
revoke all on function public.edit_debate_answer(uuid, text, text) from public, anon;
revoke all on function public.delete_debate_answer(uuid) from public, anon;
revoke all on function public.set_debate_move(uuid, boolean) from public, anon;
grant execute on function public.add_debate_answer(uuid, smallint, text, text, uuid) to authenticated, service_role;
grant execute on function public.add_debate_reply(uuid, text) to authenticated, service_role;
grant execute on function public.edit_debate_answer(uuid, text, text) to authenticated, service_role;
grant execute on function public.delete_debate_answer(uuid) to authenticated, service_role;
grant execute on function public.set_debate_move(uuid, boolean) to authenticated, service_role;

commit;
