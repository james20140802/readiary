-- 달의 발췌집: 끝난 달의 문장을 골라 순서를 정해 엮은 한 권. 사용자마다 한 달에 한 권이다.
-- 문장을 복사하지 않고 기록을 가리키므로 기록의 수정·비공개·삭제가 바로 반영된다.
-- 달은 기록의 date 기준이고, 문자열로는 'YYYY-MM'이다. 끝난 달은 KST 오늘이 속한 달보다 앞선 달이다.
-- 쓰기는 RPC로만 한다. 새 객체만 더하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다.
begin;

create table public.monthly_excerpts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  is_shared boolean not null default false,
  first_shared_at timestamptz, -- 처음 친구에게 공개한 시각. 공개를 껐다 켜거나 고쳐도 다시 찍지 않는다.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table public.monthly_excerpt_items (
  excerpt_id uuid not null references public.monthly_excerpts (id) on delete cascade,
  entry_id uuid not null references public.entries (id) on delete cascade,
  position integer not null check (position >= 1), -- 항목이 빠지면 빈 번호가 생긴다. 읽을 때 row_number()로 메운다.
  primary key (excerpt_id, entry_id),
  unique (excerpt_id, position)
);
create index monthly_excerpt_items_entry_id_idx on public.monthly_excerpt_items (entry_id);

alter table public.monthly_excerpts enable row level security;
alter table public.monthly_excerpt_items enable row level security;

revoke all on public.monthly_excerpts from public, anon, authenticated;
revoke all on public.monthly_excerpt_items from public, anon, authenticated;
grant select, delete on public.monthly_excerpts to authenticated;
grant select on public.monthly_excerpt_items to authenticated;
grant all on public.monthly_excerpts to service_role;
grant all on public.monthly_excerpt_items to service_role;

create policy "monthly_excerpts_select_own" on public.monthly_excerpts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "monthly_excerpts_delete_own" on public.monthly_excerpts
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "monthly_excerpt_items_select_own" on public.monthly_excerpt_items
  for select to authenticated
  using (
    exists (
      select 1 from public.monthly_excerpts x
      where x.id = monthly_excerpt_items.excerpt_id and x.user_id = (select auth.uid())
    )
  );

-- 내부 함수: KST 오늘. 계약 테스트가 재정의해 달 경계를 확인한다.
create or replace function public.monthly_excerpt_kst_today()
returns date
language sql stable security invoker set search_path = '' as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;
revoke all on function public.monthly_excerpt_kst_today() from public, anon;
grant execute on function public.monthly_excerpt_kst_today() to authenticated;

-- 내부 함수: 'YYYY-MM'을 그달 1일로 바꾼다.
create or replace function public.monthly_excerpt_month_start(p_month text)
returns date
language plpgsql immutable security invoker set search_path = '' as $$
begin
  if coalesce(p_month, '') !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then
    raise exception 'invalid_month';
  end if;
  return (p_month || '-01')::date;
end;
$$;
revoke all on function public.monthly_excerpt_month_start(text) from public, anon;
grant execute on function public.monthly_excerpt_month_start(text) to authenticated;

-- 빈 발췌집 정리: 트랜잭션 끝에 항목이 없으면 부모를 지운다. 재저장은 항목을 지운 뒤 다시 넣으므로
-- deferred여야 재저장 도중에 지워지지 않는다. 진행 중인 재저장을 기다린 뒤 항목을 세려고 먼저 잠근다.
create or replace function public.monthly_excerpt_drop_if_empty()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.monthly_excerpts x where x.id = old.excerpt_id for update;
  if not exists (select 1 from public.monthly_excerpt_items i where i.excerpt_id = old.excerpt_id) then
    delete from public.monthly_excerpts x where x.id = old.excerpt_id;
  end if;
  return null;
end;
$$;
revoke all on function public.monthly_excerpt_drop_if_empty() from public, anon, authenticated;

create constraint trigger monthly_excerpt_items_drop_empty
  after delete on public.monthly_excerpt_items
  deferrable initially deferred
  for each row execute function public.monthly_excerpt_drop_if_empty();

-- 기록 수정 반영: 달이 바뀌거나 문장이 비면 그 항목을 뺀다. 수정하는 사람은 항목을 지울 권한이 없어서 정의자 권한이다.
create or replace function public.monthly_excerpt_sync_entry()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.monthly_excerpt_items i
  using public.monthly_excerpts x
  where i.excerpt_id = x.id
    and i.entry_id = new.id
    and (
      x.month <> date_trunc('month', new.date::timestamp)::date
      or coalesce(new.quote, '') !~ '[^[:space:]]'
    );
  return null;
end;
$$;
revoke all on function public.monthly_excerpt_sync_entry() from public, anon, authenticated;

create trigger entries_sync_monthly_excerpt_items
  after update of date, quote on public.entries
  for each row
  when (old.date is distinct from new.date or old.quote is distinct from new.quote)
  execute function public.monthly_excerpt_sync_entry();

-- 엮기와 다시 엮기. 고른 기록이 그달의 내 문장이 아니면 조용히 빼지 않고 stale_entries로 알린다.
create or replace function public.save_monthly_excerpt(p_month text, p_entry_ids uuid[], p_is_shared boolean)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_month date;
  v_shared boolean := coalesce(p_is_shared, false);
  v_stale jsonb;
  v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  v_month := public.monthly_excerpt_month_start(p_month);
  if v_month >= date_trunc('month', public.monthly_excerpt_kst_today()::timestamp)::date then
    raise exception 'month_not_finished';
  end if;
  if coalesce(cardinality(p_entry_ids), 0) = 0 then raise exception 'no_entries'; end if;

  -- 확인과 저장 사이에 기록이 바뀌지 않게 잠근다. 동시에 고친 기록은 저장 뒤 트리거가 처리한다.
  perform 1 from public.entries e
  join public.user_books ub on ub.id = e.user_book_id
  where e.id = any (p_entry_ids) and ub.user_id = v_user
  for share of e;

  select jsonb_agg(s.id order by s.ord) into v_stale
  from (
    select u.id, min(u.ord) as ord
    from unnest(p_entry_ids) with ordinality as u(id, ord)
    group by u.id
    having count(*) > 1 or not exists (
      select 1 from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      where e.id = u.id
        and ub.user_id = v_user
        and e.date >= v_month and e.date < (v_month + interval '1 month')::date
        and e.quote ~ '[^[:space:]]'
    )
  ) s;
  if v_stale is not null then
    raise exception 'stale_entries' using detail = v_stale::text;
  end if;

  if v_shared and not exists (
    select 1 from public.entries e where e.id = any (p_entry_ids) and not e.is_private
  ) then
    raise exception 'no_public_quotes';
  end if;

  insert into public.monthly_excerpts as x (user_id, month, is_shared, first_shared_at)
  values (v_user, v_month, v_shared, case when v_shared then now() end)
  on conflict (user_id, month) do update
    set is_shared = excluded.is_shared,
        first_shared_at = case when excluded.is_shared then coalesce(x.first_shared_at, now()) else x.first_shared_at end,
        updated_at = now()
  returning x.id into v_id;

  -- unique(excerpt_id, position) 충돌을 피하려고 지운 뒤 넣는다.
  delete from public.monthly_excerpt_items i where i.excerpt_id = v_id;
  insert into public.monthly_excerpt_items (excerpt_id, entry_id, position)
  select v_id, u.id, u.ord::integer
  from unnest(p_entry_ids) with ordinality as u(id, ord);

  return v_id;
end;
$$;
revoke all on function public.save_monthly_excerpt(text, uuid[], boolean) from public, anon;
grant execute on function public.save_monthly_excerpt(text, uuid[], boolean) to authenticated;

create or replace function public.set_monthly_excerpt_shared(p_id uuid, p_is_shared boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_shared boolean := coalesce(p_is_shared, false);
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  perform 1 from public.monthly_excerpts x where x.id = p_id and x.user_id = v_user for update;
  if not found then raise exception 'not_found'; end if;

  if v_shared and not exists (
    select 1 from public.monthly_excerpt_items i
    join public.entries e on e.id = i.entry_id
    where i.excerpt_id = p_id and not e.is_private
  ) then
    raise exception 'no_public_quotes';
  end if;

  update public.monthly_excerpts x
  set is_shared = v_shared,
      first_shared_at = case when v_shared then coalesce(x.first_shared_at, now()) else x.first_shared_at end,
      updated_at = now()
  where x.id = p_id;
end;
$$;
revoke all on function public.set_monthly_excerpt_shared(uuid, boolean) from public, anon;
grant execute on function public.set_monthly_excerpt_shared(uuid, boolean) to authenticated;

-- 내 화면에서 읽는 한 권. 비공개 기록도 표시를 붙여 함께 돌려준다.
create or replace function public.get_my_monthly_excerpt(p_month text)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_month date;
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  v_month := public.monthly_excerpt_month_start(p_month);

  select jsonb_build_object(
    'id', x.id,
    'month', to_char(x.month, 'YYYY-MM'),
    'isShared', x.is_shared,
    'firstSharedAt', x.first_shared_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', n.position,
        'entryId', e.id,
        'date', e.date,
        'quote', e.quote,
        'note', e.note,
        'isPrivate', e.is_private,
        'fromPage', e.from_page,
        'toPage', e.to_page,
        'book', jsonb_build_object('id', b.id, 'title', b.title, 'author', b.author)
      ) order by n.position)
      from (
        select i.entry_id, row_number() over (order by i.position)::integer as position
        from public.monthly_excerpt_items i
        where i.excerpt_id = x.id
      ) n
      join public.entries e on e.id = n.entry_id
      join public.user_books ub on ub.id = e.user_book_id
      join public.books b on b.id = ub.book_id
    ), '[]'::jsonb)
  ) into v_result
  from public.monthly_excerpts x
  where x.user_id = (select auth.uid()) and x.month = v_month;

  return v_result;
end;
$$;
revoke all on function public.get_my_monthly_excerpt(text) from public, anon;
grant execute on function public.get_my_monthly_excerpt(text) to authenticated;

-- 문장 고르기 후보: 그달의 내 문장을 페이지 단위로. 비공개도 표시를 붙여 포함한다.
create or replace function public.get_monthly_excerpt_candidates(
  p_month text,
  p_user_book_id uuid default null,
  p_page int default 0,
  p_limit int default 30
)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_month date;
  v_limit int := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_page int := greatest(coalesce(p_page, 0), 0);
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  v_month := public.monthly_excerpt_month_start(p_month);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'entryId', c.id,
      'date', c.date,
      'quote', c.quote,
      'hasNote', coalesce(c.note ~ '[^[:space:]]', false),
      'isPrivate', c.is_private,
      'fromPage', c.from_page,
      'toPage', c.to_page,
      'userBookId', c.user_book_id,
      'bookTitle', c.title
    ) order by c.date, c.created_at, c.id)
    from (
      select e.id, e.date, e.quote, e.note, e.is_private, e.from_page, e.to_page, e.created_at, e.user_book_id, b.title
      from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      join public.books b on b.id = ub.book_id
      where ub.user_id = (select auth.uid())
        and e.date >= v_month and e.date < (v_month + interval '1 month')::date
        and e.quote ~ '[^[:space:]]'
        and (p_user_book_id is null or e.user_book_id = p_user_book_id)
      order by e.date, e.created_at, e.id
      limit v_limit offset v_page * v_limit
    ) c
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_monthly_excerpt_candidates(text, uuid, int, int) from public, anon;
grant execute on function public.get_monthly_excerpt_candidates(text, uuid, int, int) to authenticated;

-- 책 칩: 그달 문장을 남긴 책과 권별 문장 수. 많은 순.
create or replace function public.get_monthly_excerpt_month_books(p_month text)
returns table (user_book_id uuid, title text, quote_count int)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_month date;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  v_month := public.monthly_excerpt_month_start(p_month);

  return query
    select ub.id, b.title, count(*)::integer
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    join public.books b on b.id = ub.book_id
    where ub.user_id = (select auth.uid())
      and e.date >= v_month and e.date < (v_month + interval '1 month')::date
      and e.quote ~ '[^[:space:]]'
    group by ub.id, b.title
    order by count(*) desc, b.title, ub.id;
end;
$$;
revoke all on function public.get_monthly_excerpt_month_books(text) from public, anon;
grant execute on function public.get_monthly_excerpt_month_books(text) to authenticated;

-- 모아 보기의 해 목록: 끝난 달 중 문장이 있는 달만 본다. 최신 해 먼저.
create or replace function public.get_my_monthly_excerpt_years()
returns table (year int, excerpt_count int, has_unmade boolean)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_this_month date := date_trunc('month', public.monthly_excerpt_kst_today()::timestamp)::date;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  return query
    with months as (
      select distinct date_trunc('month', e.date::timestamp)::date as month_start
      from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      where ub.user_id = (select auth.uid())
        and e.date < v_this_month
        and e.quote ~ '[^[:space:]]'
    )
    select extract(year from m.month_start)::integer,
           (count(x.id))::integer,
           bool_or(x.id is null)
    from months m
    left join public.monthly_excerpts x
      on x.user_id = (select auth.uid()) and x.month = m.month_start
    group by 1
    order by 1 desc;
end;
$$;
revoke all on function public.get_my_monthly_excerpt_years() from public, anon;
grant execute on function public.get_my_monthly_excerpt_years() to authenticated;

-- 한 해의 달들: 끝난 달 중 문장이 있는 달만, 최신 달 먼저. 엮은 달의 quoteCount는 그 발췌집의 문장 수,
-- 표지는 첫 항목이다. 안 엮은 달의 quoteCount는 그달의 문장 수다.
create or replace function public.get_my_monthly_excerpt_year(p_year int)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_this_month date := date_trunc('month', public.monthly_excerpt_kst_today()::timestamp)::date;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'month', to_char(m.month_start, 'YYYY-MM'),
      'quoteCount', coalesce(a.item_count, m.quote_count),
      'excerptId', a.id,
      'isShared', coalesce(a.is_shared, false),
      'coverQuote', a.cover_quote
    ) order by m.month_start desc)
    from (
      select date_trunc('month', e.date::timestamp)::date as month_start, count(*)::integer as quote_count
      from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      where ub.user_id = (select auth.uid())
        and e.date >= make_date(p_year, 1, 1) and e.date < make_date(p_year + 1, 1, 1)
        and e.date < v_this_month
        and e.quote ~ '[^[:space:]]'
      group by 1
    ) m
    left join lateral (
      select x.id, x.is_shared,
        (select count(*)::integer from public.monthly_excerpt_items i where i.excerpt_id = x.id) as item_count,
        (select e.quote from public.monthly_excerpt_items i
         join public.entries e on e.id = i.entry_id
         where i.excerpt_id = x.id order by i.position limit 1) as cover_quote
      from public.monthly_excerpts x
      where x.user_id = (select auth.uid()) and x.month = m.month_start
    ) a on true
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_my_monthly_excerpt_year(int) from public, anon;
grant execute on function public.get_my_monthly_excerpt_year(int) to authenticated;

-- 오늘 화면의 안내: 지난달에 문장이 있고 아직 엮지 않았을 때만 그달의 수를 돌려준다.
create or replace function public.get_monthly_excerpt_prompt(p_today date)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_month date := (date_trunc('month', p_today::timestamp) - interval '1 month')::date;
  v_quotes integer;
  v_books integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  if exists (
    select 1 from public.monthly_excerpts x
    where x.user_id = (select auth.uid()) and x.month = v_month
  ) then
    return null;
  end if;

  select count(*)::integer, count(distinct e.user_book_id)::integer into v_quotes, v_books
  from public.entries e
  join public.user_books ub on ub.id = e.user_book_id
  where ub.user_id = (select auth.uid())
    and e.date >= v_month and e.date < (v_month + interval '1 month')::date
    and e.quote ~ '[^[:space:]]';

  if v_quotes = 0 then return null; end if;
  return jsonb_build_object('month', to_char(v_month, 'YYYY-MM'), 'quoteCount', v_quotes, 'bookCount', v_books);
end;
$$;
revoke all on function public.get_monthly_excerpt_prompt(date) from public, anon;
grant execute on function public.get_monthly_excerpt_prompt(date) to authenticated;

commit;
