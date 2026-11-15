-- 달마다 한 문장: 일기장에 한 달에 문장 하나를 보인다. 독자가 직접 고르거나, 고르지 않은 달은 자동 기준으로 채운다.
-- 순서는 [내가 고른 문장 → 달의 발췌집 표지 → 자동 기준]이다. 친구에게는 같은 순서를 공개 기록 안에서 다시 따진다.
-- 달은 기록의 date 기준이고 문자열로는 'YYYY-MM'이다. 후보는 문장(quote)이 있는 기록뿐이다.
-- 테이블은 본인 읽기만 열고, 쓰기와 친구의 읽기는 아래 RPC로만 한다.
-- 새 객체만 더하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다.
begin;

-- 달별 선택. 문장을 복사하지 않고 기록을 가리킨다. 기록이 지워지면 함께 사라진다.
-- 기록의 날짜가 다른 달로 옮겨지거나 문장이 지워진 선택은 지우지 않고 읽을 때 무시한다(되돌리면 다시 살아난다).
create table public.monthly_sentence_picks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  entry_id uuid not null references public.entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, month)
);
create index monthly_sentence_picks_entry_id_idx on public.monthly_sentence_picks (entry_id);

-- 자동 기준. 행이 없으면 'likes'다. 프로필과 따로 두어 친구에게 읽히지 않는다.
create table public.monthly_sentence_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rule text not null check (rule in ('likes', 'reflections', 'recent'))
);

alter table public.monthly_sentence_picks enable row level security;
alter table public.monthly_sentence_settings enable row level security;

revoke all on public.monthly_sentence_picks from public, anon, authenticated;
revoke all on public.monthly_sentence_settings from public, anon, authenticated;
grant select on public.monthly_sentence_picks to authenticated;
grant select on public.monthly_sentence_settings to authenticated;
grant all on public.monthly_sentence_picks to service_role;
grant all on public.monthly_sentence_settings to service_role;

create policy "monthly_sentence_picks_select_own" on public.monthly_sentence_picks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "monthly_sentence_settings_select_own" on public.monthly_sentence_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 내부 함수: 이 사람에게 이어 남긴 생각이 켜져 있는가. entry_reflections_enabled()와 같은 식을 남의 id로 본다.
-- 친구 화면의 계산에 주인의 설정이 필요해서 둔다. 아무도 직접 부르지 못한다.
create function public.monthly_sentence_reflections_on(p_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select f.enabled and p_user is not null and (
      p_user = any(f.user_ids) or
      (('x' || substr(md5('entry_reflections:' || p_user::text), 1, 8))::bit(32)::bigint % 100) < f.percentage
    )
    from public.feature_rollouts f where f.key = 'entry_reflections'
  ), false);
$$;
revoke all on function public.monthly_sentence_reflections_on(uuid) from public, anon, authenticated;

-- 내부 함수: 한 사람의 달 범위에서 달마다 문장 하나. 후보가 있는 달만 돌려준다.
-- p_friend면 공개 기록만 후보이고, 공유 중인 발췌집만 표지가 되며, 친구가 읽을 수 있는 생각만 센다.
-- 보는 사람이 누구인지는 확인하지 않는다. 확인은 공개 RPC의 몫이라 아무도 직접 부르지 못한다.
create function public.monthly_sentence_resolve(p_owner uuid, p_from date, p_to date, p_friend boolean)
returns table (month_start date, entry_id uuid, source text)
language sql stable security definer set search_path = '' as $$
  with cfg as (
    select case
      when s.rule = 'reflections' and not public.monthly_sentence_reflections_on(p_owner) then 'recent'
      else coalesce(s.rule, 'likes')
    end as rule
    from (select 1) one
    left join public.monthly_sentence_settings s on s.user_id = p_owner
  ),
  cand as (
    select e.id, date_trunc('month', e.date::timestamp)::date as m, e.date, e.created_at
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    where ub.user_id = p_owner
      and e.date >= p_from
      and e.date < (p_to + interval '1 month')
      and e.quote ~ '[^[:space:]]'
      and (not p_friend or e.is_private is false)
  ),
  scored as (
    select c.*,
      case (select rule from cfg)
        when 'likes' then (
          select count(*) from public.likes l
          where l.entry_id = c.id and public.is_account_active(l.user_id))
        when 'reflections' then (
          select count(*) from public.entry_reflections r
          where r.entry_id = c.id and (not p_friend or not r.is_private))
        else 0
      end as score
    from cand c
  ),
  auto as (
    select distinct on (s.m) s.m, s.id
    from scored s
    order by s.m, s.score desc, s.date desc, s.created_at desc nulls last, s.id desc
  ),
  picked as (
    select p.month as m, c.id
    from public.monthly_sentence_picks p
    join cand c on c.id = p.entry_id and c.m = p.month
    where p.user_id = p_owner
  ),
  cover as (
    select x.month as m, f.id
    from public.monthly_excerpts x
    cross join lateral (
      select c.id
      from public.monthly_excerpt_items i
      join cand c on c.id = i.entry_id and c.m = x.month
      where i.excerpt_id = x.id
      order by i.position
      limit 1
    ) f
    where x.user_id = p_owner and (not p_friend or x.is_shared)
  )
  select a.m,
    coalesce(p.id, cv.id, a.id),
    case when p.id is not null then 'picked' when cv.id is not null then 'excerpt' else 'auto' end
  from auto a
  left join picked p on p.m = a.m
  left join cover cv on cv.m = a.m;
$$;
revoke all on function public.monthly_sentence_resolve(uuid, date, date, boolean) from public, anon, authenticated;

-- 내부 함수: 본인 화면의 줄. p_from~p_to의 달력 달을 최신부터, 기록이 없는 달도 한 줄씩 돌려준다.
create function public.monthly_sentence_own_rows(p_owner uuid, p_from date, p_to date)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(g.m, 'YYYY-MM'),
    'entryId', r.entry_id,
    'quote', e.quote,
    'bookTitle', b.title,
    'fromPage', e.from_page,
    'toPage', e.to_page,
    'source', r.source,
    'entryCount', (
      select count(*)::integer
      from public.entries e2
      join public.user_books ub2 on ub2.id = e2.user_book_id
      where ub2.user_id = p_owner and e2.date >= g.m and e2.date < (g.m + interval '1 month')),
    'isPrivate', coalesce(e.is_private, false),
    'friendFallback', case
      when r.source = 'picked' and e.is_private then
        case when exists (
          select 1
          from public.entries e3
          join public.user_books ub3 on ub3.id = e3.user_book_id
          where ub3.user_id = p_owner and e3.date >= g.m and e3.date < (g.m + interval '1 month')
            and e3.quote ~ '[^[:space:]]' and e3.is_private is false
        ) then 'other' else 'none' end
    end,
    'excerpt', case
      when exists (select 1 from public.monthly_excerpts x where x.user_id = p_owner and x.month = g.m) then 'made'
      when r.entry_id is not null
        and g.m < date_trunc('month', public.monthly_excerpt_kst_today()::timestamp)::date then 'unmade'
      else 'none'
    end
  ) order by g.m desc), '[]'::jsonb)
  from (
    select s::date as m from generate_series(p_from::timestamp, p_to::timestamp, interval '1 month') s
  ) g
  left join public.monthly_sentence_resolve(p_owner, p_from, p_to, false) r on r.month_start = g.m
  left join public.entries e on e.id = r.entry_id
  left join public.user_books ub on ub.id = e.user_book_id
  left join public.books b on b.id = ub.book_id;
$$;
revoke all on function public.monthly_sentence_own_rows(uuid, date, date) from public, anon, authenticated;

-- 일기장의 달마다 한 문장. 본인이면 내 화면, 친구면 친구 화면, 그 밖에는 빈 결과다.
-- p_before('YYYY-MM')보다 앞선 달부터 최신순으로 돌려준다. 범위는 이번 달 포함 최근 24개월이다.
-- 본인: 달력 달 단위로 p_limit줄. 첫 기록의 달에서 끝난다. 기록이 없는 사이 달도 줄로 나온다.
-- 친구: 공개 문장이 있는 달만 p_limit줄. 비공개 기록에서 나온 값은 응답 어디에도 없고,
--       nextBefore도 공개 문장이 있는 달이 더 남았을 때만 채운다.
create function public.get_monthly_sentences(p_owner uuid, p_before text default null, p_limit integer default 6)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_viewer uuid := (select auth.uid());
  v_limit integer := least(greatest(coalesce(p_limit, 6), 1), 24);
  v_this date := date_trunc('month', public.monthly_excerpt_kst_today()::timestamp)::date;
  v_floor date := (v_this - interval '23 months')::date;
  v_top date := v_this;
  v_bottom date;
  v_last date;
  v_rows jsonb := '[]'::jsonb;
  v_next text;
  v_own boolean;
  v_bad_before boolean := false;
begin
  if v_viewer is null then raise exception 'Authentication required'; end if;

  v_own := p_owner is not distinct from v_viewer;
  if not v_own and not coalesce(public.is_friend_with(p_owner), false) then
    return jsonb_build_object('mode', 'none', 'rows', '[]'::jsonb, 'nextBefore', null);
  end if;

  if p_before is not null then
    if p_before ~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then
      v_top := least(v_this, (to_date(p_before || '-01', 'YYYY-MM-DD') - interval '1 month')::date);
    else
      v_bad_before := true;
    end if;
  end if;

  if v_own then
    select greatest(v_floor, date_trunc('month', min(e.date)::timestamp)::date) into v_bottom
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    where ub.user_id = p_owner;

    if not v_bad_before and v_bottom is not null and v_top >= v_bottom then
      v_last := greatest(v_bottom, (v_top - make_interval(months => v_limit - 1))::date);
      v_rows := public.monthly_sentence_own_rows(p_owner, v_last, v_top);
      if v_last > v_bottom then v_next := to_char(v_last, 'YYYY-MM'); end if;
    end if;

    return jsonb_build_object(
      'mode', 'own',
      'rule', coalesce((select s.rule from public.monthly_sentence_settings s where s.user_id = p_owner), 'likes'),
      'reflectionsOn', public.monthly_sentence_reflections_on(p_owner),
      'rows', v_rows,
      'nextBefore', v_next
    );
  end if;

  -- 친구
  if not v_bad_before and v_top >= v_floor then
    with page as (
      select r.month_start, r.entry_id
      from public.monthly_sentence_resolve(p_owner, v_floor, v_top, true) r
      order by r.month_start desc
      limit v_limit + 1
    ), shown as (
      select * from page order by month_start desc limit v_limit
    )
    select
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', to_char(s.month_start, 'YYYY-MM'),
          'entryId', e.id,
          'quote', e.quote,
          'bookTitle', b.title,
          'fromPage', e.from_page,
          'toPage', e.to_page,
          'hasExcerpt', exists (
            select 1 from public.monthly_excerpts x
            where x.user_id = p_owner and x.month = s.month_start and x.is_shared
              and exists (select 1 from public.monthly_excerpt_visible_items(x.id)))
        ) order by s.month_start desc)
        from shown s
        join public.entries e on e.id = s.entry_id
        join public.user_books ub on ub.id = e.user_book_id
        join public.books b on b.id = ub.book_id
      ), '[]'::jsonb),
      case when (select count(*) from page) > v_limit
        then (select to_char(min(s.month_start), 'YYYY-MM') from shown s) end
    into v_rows, v_next;
  end if;

  return jsonb_build_object(
    'mode', 'friend',
    'hasAnyExcerpt', exists (
      select 1 from public.monthly_excerpts x
      where x.user_id = p_owner and x.is_shared
        and exists (select 1 from public.monthly_excerpt_visible_items(x.id))),
    'rows', v_rows,
    'nextBefore', v_next
  );
end;
$$;
revoke all on function public.get_monthly_sentences(uuid, text, integer) from public, anon;
grant execute on function public.get_monthly_sentences(uuid, text, integer) to authenticated;

-- 문장 고르기의 후보: 그 달의 내 문장을 최근 것부터. 비공개 문장도 isPrivate 표시와 함께 내려간다(내 화면).
-- publicCount로 나만 보기 문장을 고를 때 친구에게 다른 문장이 보일지, 그 달이 안 보일지를 알린다.
create function public.get_monthly_sentence_candidates(p_month text, p_offset integer default 0, p_limit integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_month date;
  v_result jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if coalesce(p_month, '') !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then raise exception 'invalid_month'; end if;
  v_month := to_date(p_month || '-01', 'YYYY-MM-DD');

  with cand as (
    select e.id, e.quote, e.date, e.created_at, e.is_private, b.title
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    join public.books b on b.id = ub.book_id
    where ub.user_id = v_user
      and e.date >= v_month and e.date < (v_month + interval '1 month')
      and e.quote ~ '[^[:space:]]'
  ), page as (
    select * from cand c
    order by c.date desc, c.created_at desc nulls last, c.id desc
    offset greatest(coalesce(p_offset, 0), 0)
    limit least(greatest(coalesce(p_limit, 30), 1), 50)
  )
  select jsonb_build_object(
    'pickedEntryId', (
      select p.entry_id from public.monthly_sentence_picks p
      join cand c on c.id = p.entry_id
      where p.user_id = v_user and p.month = v_month),
    'publicCount', (select count(*)::integer from cand c where c.is_private is false),
    'total', (select count(*)::integer from cand),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'entryId', g.id, 'quote', g.quote, 'bookTitle', g.title,
        'date', to_char(g.date, 'YYYY-MM-DD'), 'isPrivate', g.is_private
      ) order by g.date desc, g.created_at desc nulls last, g.id desc)
      from page g
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.get_monthly_sentence_candidates(text, integer, integer) from public, anon;
grant execute on function public.get_monthly_sentence_candidates(text, integer, integer) to authenticated;

-- 그 달의 문장을 고르거나(p_entry_id) 자동으로 되돌린다(null). 바뀐 뒤의 내 화면 줄 하나를 돌려준다.
create function public.set_monthly_sentence(p_month text, p_entry_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_month date;
begin
  -- 유예 중인 계정은 옛 토큰이 남아 있어도 쓰지 못한다.
  perform public.assert_account_active();
  if v_user is null then raise exception 'Authentication required'; end if;
  if coalesce(p_month, '') !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then raise exception 'invalid_month'; end if;
  v_month := to_date(p_month || '-01', 'YYYY-MM-DD');

  if p_entry_id is null then
    delete from public.monthly_sentence_picks p where p.user_id = v_user and p.month = v_month;
  else
    if not exists (
      select 1
      from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      where e.id = p_entry_id
        and ub.user_id = v_user
        and e.quote ~ '[^[:space:]]'
        and e.date >= v_month and e.date < (v_month + interval '1 month')
    ) then
      raise exception 'invalid_entry';
    end if;

    insert into public.monthly_sentence_picks as p (user_id, month, entry_id)
    values (v_user, v_month, p_entry_id)
    on conflict (user_id, month) do update set entry_id = excluded.entry_id, created_at = now();
  end if;

  return public.monthly_sentence_own_rows(v_user, v_month, v_month) -> 0;
end;
$$;
revoke all on function public.set_monthly_sentence(text, uuid) from public, anon;
grant execute on function public.set_monthly_sentence(text, uuid) to authenticated;

-- 고르지 않은 달을 채우는 자동 기준을 바꾼다. 일기장 전체에 하나다.
create function public.set_monthly_sentence_rule(p_rule text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  perform public.assert_account_active();
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_rule is null or p_rule not in ('likes', 'reflections', 'recent') then raise exception 'invalid_rule'; end if;

  insert into public.monthly_sentence_settings as s (user_id, rule)
  values (v_user, p_rule)
  on conflict (user_id) do update set rule = excluded.rule;
end;
$$;
revoke all on function public.set_monthly_sentence_rule(text) from public, anon;
grant execute on function public.set_monthly_sentence_rule(text) to authenticated;

commit;
