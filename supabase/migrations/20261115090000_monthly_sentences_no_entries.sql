-- 달마다 한 문장: 기록이 하나도 없는 계정의 내 일기장은 빈 목록이다.
-- 앞선 정의는 첫 기록의 달을 greatest(v_floor, min(...))로 구했는데, greatest가 null을 건너뛰어
-- 기록이 없어도 24개월 바닥이 남았다. 그래서 새 계정(또는 마지막 기록을 지운 계정)에
-- "쉬어 간 달" 여섯 줄과 다음 쪽이 내려가, 화면이 첫 문장 안내를 보이지 못했다.
-- 시그니처가 같아 권한(authenticated만 실행)은 그대로다. 본문의 나머지는 20261113090000과 같다.
create or replace function public.get_monthly_sentences(p_owner uuid, p_before text default null, p_limit integer default 6)
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
    -- 첫 기록의 달. 기록이 없으면 null로 남아 아래에서 빈 목록이 된다.
    select date_trunc('month', min(e.date)::timestamp)::date into v_bottom
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    where ub.user_id = p_owner;
    -- greatest는 null을 건너뛰므로, 기록이 있을 때만 24개월 바닥을 적용한다.
    if v_bottom is not null then v_bottom := greatest(v_floor, v_bottom); end if;

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
