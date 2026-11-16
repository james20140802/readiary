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

commit;
