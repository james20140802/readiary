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
  -- 같은 트랜잭션 안에서도 먼저 남긴 순서가 정해지도록 clock_timestamp()를 쓴다.
  created_at timestamptz not null default clock_timestamp(),
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
  created_at timestamptz not null default clock_timestamp(),
  -- 먼저 남긴 순서. 같은 시각에 남긴 답도 순서가 정해진다.
  seq bigint generated always as identity,
  unique (id, debate_id),
  foreign key (parent_id, debate_id) references public.debate_answers (id, debate_id) on delete cascade,
  foreign key (debate_id, underline_position) references public.debate_underlines (debate_id, position) on delete cascade,
  check ((parent_id is null) = (stance is not null)),
  check (parent_id is null or underline_position is null),
  check (deleted_at is not null or body is not null)
);
create index debate_answers_section_idx on public.debate_answers (debate_id, underline_position, seq);
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

-- 답이 보이는가: 토론을 볼 수 있고, 숨긴 답이면 쓴 사람이나 발제자일 때만.
create function public.debate_can_see_answer(p_debate_id uuid, p_author uuid, p_hidden_at timestamptz)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_view_debate(p_debate_id)
    and (
      p_hidden_at is null
      or p_author = (select auth.uid())
      or exists (select 1 from public.debates d where d.id = p_debate_id and d.user_id = (select auth.uid()))
    );
$$;
revoke all on function public.debate_can_see_answer(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.debate_can_see_answer(uuid, uuid, timestamptz) to authenticated, service_role;

create policy debate_answers_select_viewable on public.debate_answers
  for select to authenticated using (public.debate_can_see_answer(debate_id, user_id, hidden_at));
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
  select id, debate_id, parent_id, deleted_at, user_id, hidden_at into v_parent from public.debate_answers where id = p_answer_id;
  if not found or v_parent.deleted_at is not null
     or not public.debate_can_see_answer(v_parent.debate_id, v_parent.user_id, v_parent.hidden_at) then
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

-- ── 정리·숨기기·신고 ─────────────────────────────────────────
-- 신고: 운영자가 service_role로 확인한다. 일반 사용자는 읽지도 직접 쓰지도 못한다.
create table public.debate_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  debate_id uuid not null references public.debates (id) on delete cascade,
  answer_id uuid references public.debate_answers (id) on delete cascade,
  reason text not null check (reason in ('abuse', 'spam', 'privacy', 'other')),
  memo text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (reporter_id, debate_id, answer_id)
);
create index debate_reports_created_idx on public.debate_reports (created_at desc);
create index debate_reports_answer_idx on public.debate_reports (answer_id) where answer_id is not null;
alter table public.debate_reports enable row level security;
revoke all on public.debate_reports from public, anon, authenticated;
grant all on public.debate_reports to service_role;

-- 정리하기·정리 고치기. 처음 정리할 때 닫는다(닫힌 시각은 고쳐도 그대로).
-- 짚는 답은 0~2개, 같은 토론의 지우지 않은 답(답글 아님)만.
create function public.set_debate_summary(p_id uuid, p_summary text, p_answer_ids uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_summary text := btrim(coalesce(p_summary, ''));
  v_pins uuid[] := coalesce(p_answer_ids, '{}');
begin
  perform public.assert_account_active();
  if not exists (
    select 1 from public.debates where id = p_id and user_id = (select auth.uid())
  ) or not public.can_view_debate(p_id) then
    raise exception 'not_found';
  end if;
  if char_length(v_summary) = 0 or char_length(v_summary) > 2000 then raise exception 'invalid_summary'; end if;
  if cardinality(v_pins) > 2
     or cardinality(v_pins) <> (select count(distinct x) from unnest(v_pins) x)
     or exists (
       select 1 from unnest(v_pins) x
       where not exists (
         select 1 from public.debate_answers a
         where a.id = x and a.debate_id = p_id and a.parent_id is null and a.deleted_at is null
       )
     ) then
    raise exception 'invalid_pins';
  end if;
  update public.debates
  set summary = v_summary, summary_answer_ids = v_pins, closed_at = coalesce(closed_at, now()), updated_at = now()
  where id = p_id;
end;
$$;

-- 정리를 지우면 다시 열린다.
create function public.clear_debate_summary(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_account_active();
  update public.debates
  set summary = null, summary_answer_ids = '{}', closed_at = null, updated_at = now()
  where id = p_id and user_id = (select auth.uid());
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- 숨기기: 발제자만, 답과 답글 모두.
create function public.set_debate_answer_hidden(p_answer_id uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_account_active();
  update public.debate_answers a
  set hidden_at = case when coalesce(p_hidden, false) then coalesce(a.hidden_at, now()) end
  from public.debates d
  where a.id = p_answer_id and d.id = a.debate_id and d.user_id = (select auth.uid());
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- 신고: 볼 수 있는 토론이나 그 안의 보이는 답(답글 포함). 같은 대상은 한 번.
create function public.report_debate(p_debate_id uuid, p_answer_id uuid, p_reason text, p_memo text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_memo text := nullif(btrim(coalesce(p_memo, '')), '');
begin
  perform public.assert_account_active();
  if not public.can_view_debate(p_debate_id) then raise exception 'not_found'; end if;
  if p_answer_id is not null and not exists (
    select 1 from public.debate_answers a
    where a.id = p_answer_id and a.debate_id = p_debate_id
      and public.debate_can_see_answer(a.debate_id, a.user_id, a.hidden_at)
  ) then
    raise exception 'not_found';
  end if;
  if p_reason is null or p_reason not in ('abuse', 'spam', 'privacy', 'other')
     or char_length(coalesce(v_memo, '')) > 500 then
    raise exception 'invalid_reason';
  end if;
  insert into public.debate_reports (reporter_id, debate_id, answer_id, reason, memo)
  values ((select auth.uid()), p_debate_id, p_answer_id, p_reason, v_memo);
exception when unique_violation then
  raise exception 'already_reported';
end;
$$;

revoke all on function public.set_debate_summary(uuid, text, uuid[]) from public, anon;
revoke all on function public.clear_debate_summary(uuid) from public, anon;
revoke all on function public.set_debate_answer_hidden(uuid, boolean) from public, anon;
revoke all on function public.report_debate(uuid, uuid, text, text) from public, anon;
grant execute on function public.set_debate_summary(uuid, text, uuid[]) to authenticated, service_role;
grant execute on function public.clear_debate_summary(uuid) to authenticated, service_role;
grant execute on function public.set_debate_answer_hidden(uuid, boolean) to authenticated, service_role;
grant execute on function public.report_debate(uuid, uuid, text, text) to authenticated, service_role;

-- ── 읽기 ─────────────────────────────────────────────────────
-- 보는 사람은 auth.uid()로만 정한다. 집계·대표 답에 드는 답(“센다”): 답글 아님, 지우지 않음, 숨기지 않음, 쓴 사람 활성.
-- 생각이 바뀌었어요 수도 활성 계정의 누름만 센다.

create function public.debate_person_json(p_user uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'nickname', case when x.active then p.nickname end,
    'profile_image', case when x.active then p.profile_image end,
    'is_friend', x.active and p.id <> (select auth.uid()) and public.is_friend_with(p.id),
    'is_me', p.id = (select auth.uid()),
    'active', x.active
  )
  from public.profiles p
  cross join lateral (select public.is_account_active(p.id) as active) x
  where p.id = p_user;
$$;

create function public.debate_moved_count(p_answer_id uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.debate_moves m
  where m.answer_id = p_answer_id and public.is_account_active(m.user_id);
$$;

-- 답(또는 답글) 하나. p_with_replies면 보이는 답글 앞의 두 개를 함께 싣는다.
create function public.debate_answer_json(p_id uuid, p_with_replies boolean)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id,
    'author', public.debate_person_json(a.user_id),
    'stance', a.stance,
    'body', case when a.deleted_at is null and x.active then a.body end,
    'evidence', case when a.evidence_quote is not null and a.deleted_at is null and x.active then jsonb_build_object(
      'quote', a.evidence_quote,
      'book_title', a.evidence_book_title,
      'book_author', a.evidence_book_author,
      'page_from', a.evidence_page_from,
      'page_to', a.evidence_page_to,
      'entry_id', case when a.user_id = (select auth.uid()) or exists (
          select 1 from public.entries e
          where e.id = a.evidence_entry_id and not e.is_private and public.is_friend_with(a.user_id)
        ) then a.evidence_entry_id end
    ) end,
    'moved_count', public.debate_moved_count(a.id),
    'moved_by_me', exists (select 1 from public.debate_moves m where m.answer_id = a.id and m.user_id = (select auth.uid())),
    'reply_count', (
      select count(*)::int from public.debate_answers r
      where r.parent_id = a.id and r.deleted_at is null and public.is_account_active(r.user_id)
        and public.debate_can_see_answer(r.debate_id, r.user_id, r.hidden_at)
    ),
    'replies', case when p_with_replies then (
      select coalesce(jsonb_agg(public.debate_answer_json(r.id, false) order by r.seq), '[]'::jsonb)
      from (
        select r.id, r.seq from public.debate_answers r
        where r.parent_id = a.id and r.deleted_at is null and public.is_account_active(r.user_id)
          and public.debate_can_see_answer(r.debate_id, r.user_id, r.hidden_at)
        order by r.seq
        limit 2
      ) r
    ) end,
    'hidden', a.hidden_at is not null,
    'deleted', a.deleted_at is not null,
    'edited', a.edited_at is not null,
    'reported_by_me', exists (
      select 1 from public.debate_reports rp where rp.answer_id = a.id and rp.reporter_id = (select auth.uid())
    ),
    'created_at', a.created_at
  )
  from public.debate_answers a
  cross join lateral (select public.is_account_active(a.user_id) as active) x
  where a.id = p_id;
$$;

-- 세는 답의 입장별 수와, 이 토론에서 생각이 바뀐 사람 수(중복 없이).
create function public.debate_totals(p_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with counted as (
    select a.id, a.stance from public.debate_answers a
    where a.debate_id = p_id and a.parent_id is null and a.deleted_at is null and a.hidden_at is null
      and public.is_account_active(a.user_id)
  )
  select jsonb_build_object(
    'agree', (select count(*) from counted where stance = 'agree'),
    'differ', (select count(*) from counted where stance = 'differ'),
    'question', (select count(*) from counted where stance = 'question'),
    'moved_people', (
      select count(distinct m.user_id) from public.debate_moves m
      where m.answer_id in (select id from counted) and public.is_account_active(m.user_id)
    )
  );
$$;

-- 토론 한 편: 문장·질문·정리·집계와 밑줄마다의 단락(분포 + 대표 답 둘).
create function public.get_debate(p_id uuid)
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
  v_picks jsonb;
  v_kinds jsonb;
  v_summary jsonb;
begin
  if not public.can_view_debate(p_id) then raise exception 'not_found'; end if;
  select * into d from public.debates where id = p_id;

  for v_sec in
    select u.position, u.start_at, u.end_at from public.debate_underlines u where u.debate_id = p_id
    union all
    select null::smallint, null::int, null::int
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
      'position', v_sec.position, 'start', v_sec.start_at, 'end', v_sec.end_at,
      'count', v_stats.n, 'agree', v_stats.agree, 'differ', v_stats.differ, 'question', v_stats.question,
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

-- 단락의 답 한 쪽. 보는 사람에게 보이는 답 전부(숨긴 내 답·자리만 남은 답·떠난 사람의 답 포함).
-- 정렬: 생각이 바뀐 수, 먼저 남긴 순. p_after는 건너뛸 개수, p_limit은 1~30.
create function public.get_debate_answers(
  p_id uuid, p_position smallint, p_all_sentence boolean, p_after integer, p_limit integer
)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 30);
  v_after int := greatest(coalesce(p_after, 0), 0);
  v_rows jsonb;
  v_more boolean;
begin
  if not public.can_view_debate(p_id) then raise exception 'not_found'; end if;
  with candidates as (
    select a.id, public.debate_moved_count(a.id) as mc, a.seq
    from public.debate_answers a
    where a.debate_id = p_id and a.parent_id is null
      and case when coalesce(p_all_sentence, false) then a.underline_position is null
               else a.underline_position = p_position end
      and public.debate_can_see_answer(a.debate_id, a.user_id, a.hidden_at)
  ), page as (
    select id, row_number() over (order by mc desc, seq) as rn from candidates
  )
  select coalesce(jsonb_agg(public.debate_answer_json(id, true) order by rn), '[]'::jsonb),
         (select count(*) from page) > v_after + v_limit
    into v_rows, v_more
  from page where rn > v_after and rn <= v_after + v_limit;
  return jsonb_build_object('answers', v_rows, 'next', case when v_more then v_after + v_limit end);
end;
$$;

-- 답 하나의 보이는 답글 전부(먼저 남긴 순).
create function public.get_debate_replies(p_answer_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_parent record;
begin
  select id, debate_id, user_id, hidden_at into v_parent from public.debate_answers
  where id = p_answer_id and parent_id is null;
  if not found or not public.debate_can_see_answer(v_parent.debate_id, v_parent.user_id, v_parent.hidden_at) then
    raise exception 'not_found';
  end if;
  return (
    select coalesce(jsonb_agg(public.debate_answer_json(r.id, false) order by r.seq), '[]'::jsonb)
    from public.debate_answers r
    where r.parent_id = p_answer_id and r.deleted_at is null and public.is_account_active(r.user_id)
      and public.debate_can_see_answer(r.debate_id, r.user_id, r.hidden_at)
  );
end;
$$;

-- 내 답에 생각이 바뀌었다고 누른 사람들. 답 쓴 사람만 본다.
create function public.get_debate_movers(p_answer_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.debate_answers a
    where a.id = p_answer_id and a.parent_id is null and a.user_id = (select auth.uid())
      and public.can_view_debate(a.debate_id)
  ) then
    raise exception 'not_found';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'nickname', p.nickname, 'profile_image', p.profile_image,
        'is_friend', public.is_friend_with(p.id)
      ) order by m.created_at desc), '[]'::jsonb)
    from public.debate_moves m
    join public.profiles p on p.id = m.user_id
    where m.answer_id = p_answer_id and public.is_account_active(m.user_id)
  );
end;
$$;

-- 토론 목록: 내 토론과 친구들의 토론. 진행 중은 최근 활동 순, 정리된 것은 정리한 순.
-- p_before는 앞 쪽 마지막 항목의 시각(그보다 이른 것부터), p_limit은 1~30.
create function public.list_debates(p_closed boolean, p_before timestamptz, p_limit integer)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 30);
  v_items jsonb;
  v_last timestamptz;
  v_n int;
begin
  with friend_ids as (
    select f.friend_id as id from public.friends f where f.user_id = v_uid and f.status = 'accepted'
    union
    select f.user_id from public.friends f where f.friend_id = v_uid and f.status = 'accepted'
  ), visible as (
    select d.*,
      case when coalesce(p_closed, false) then d.closed_at
           else greatest(d.created_at, coalesce((select max(a.created_at) from public.debate_answers a where a.debate_id = d.id), d.created_at))
      end as sort_at
    from public.debates d
    where (d.user_id = v_uid or d.user_id in (select id from friend_ids))
      and public.is_account_active(d.user_id)
      and (d.closed_at is not null) = coalesce(p_closed, false)
  ), picked as (
    select * from visible
    where p_before is null or sort_at < p_before
    order by sort_at desc, id desc
    limit v_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id,
      'owner', public.debate_person_json(x.user_id) - 'active',
      'quote', x.quote,
      'underlines', (
        select coalesce(jsonb_agg(jsonb_build_object('start', u.start_at, 'end', u.end_at) order by u.position), '[]'::jsonb)
        from public.debate_underlines u where u.debate_id = x.id
      ),
      'question', x.question,
      'totals', public.debate_totals(x.id),
      'answer_count', (
        select count(*) from public.debate_answers a
        where a.debate_id = x.id and a.parent_id is null and a.deleted_at is null and a.hidden_at is null
          and public.is_account_active(a.user_id)
      ),
      'top_line', (
        select jsonb_build_object(
          'nickname', p.nickname,
          'body', split_part(a.body, E'\n', 1),
          'kind', case when public.debate_moved_count(a.id) > 0 then 'most_moved' else 'newest' end
        )
        from public.debate_answers a join public.profiles p on p.id = a.user_id
        where a.debate_id = x.id and a.parent_id is null and a.deleted_at is null and a.hidden_at is null
          and public.is_account_active(a.user_id)
        order by public.debate_moved_count(a.id) desc,
                 case when public.debate_moved_count(a.id) > 0 then a.seq end asc,
                 a.seq desc
        limit 1
      ),
      'summary_first_line', case when x.summary is not null then split_part(x.summary, E'\n', 1) end,
      'closed_at', x.closed_at,
      'last_activity_at', x.sort_at
    ) order by x.sort_at desc, x.id desc), '[]'::jsonb),
    min(x.sort_at), count(*)
  into v_items, v_last, v_n
  from picked x;
  return jsonb_build_object('items', v_items, 'next_before', case when v_n = v_limit then v_last end);
end;
$$;

revoke all on function public.debate_person_json(uuid) from public, anon, authenticated;
revoke all on function public.debate_moved_count(uuid) from public, anon, authenticated;
revoke all on function public.debate_answer_json(uuid, boolean) from public, anon, authenticated;
revoke all on function public.debate_totals(uuid) from public, anon, authenticated;
revoke all on function public.get_debate(uuid) from public, anon;
revoke all on function public.get_debate_answers(uuid, smallint, boolean, integer, integer) from public, anon;
revoke all on function public.get_debate_replies(uuid) from public, anon;
revoke all on function public.get_debate_movers(uuid) from public, anon;
revoke all on function public.list_debates(boolean, timestamptz, integer) from public, anon;
grant execute on function public.get_debate(uuid) to authenticated, service_role;
grant execute on function public.get_debate_answers(uuid, smallint, boolean, integer, integer) to authenticated, service_role;
grant execute on function public.get_debate_replies(uuid) to authenticated, service_role;
grant execute on function public.get_debate_movers(uuid) to authenticated, service_role;
grant execute on function public.list_debates(boolean, timestamptz, integer) to authenticated, service_role;

commit;
