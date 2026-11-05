-- 친구가 읽는 달의 발췌집. 친구에게는 공개 기록만 보이고, 비공개 기록의 id·개수·순서 번호의 빈틈이 남지 않는다.
-- 테이블 정책은 그대로 소유자 전용이다. 친구의 길은 아래 RPC뿐이고, 모두 안에서 auth.uid()로 친구 관계를 확인한다.
-- 친구가 아니거나, 공개하지 않았거나, 공개 문장이 없거나, 없는 권이거나, 입력이 잘못된 경우는 모두 같은 빈 결과다.
-- 그래서 응답으로 권의 존재를 알아낼 수 없다. 새 함수만 더하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다.
begin;

-- 내부 함수: 한 권에서 친구에게 보이는 항목. 번호는 거른 뒤에 매기므로 빈틈이 없다.
-- 친구 관계와 공개 여부는 확인하지 않는다. 확인은 아래 공개 RPC의 몫이라 아무도 직접 부르지 못하게 한다.
-- 호출자 권한으로 돌므로 정의자 함수 안에서만 RLS를 넘는다.
create or replace function public.monthly_excerpt_visible_items(p_id uuid)
returns table (
  item_position integer,
  entry_id uuid,
  entry_date date,
  quote text,
  note text,
  from_page integer,
  to_page integer,
  book_id uuid,
  book_title text,
  book_author text
)
language sql stable security invoker set search_path = '' as $$
  select
    (row_number() over (order by i.position))::integer,
    e.id, e.date, e.quote, e.note, e.from_page, e.to_page,
    b.id, b.title, b.author
  from public.monthly_excerpt_items i
  join public.monthly_excerpts x on x.id = i.excerpt_id
  join public.entries e on e.id = i.entry_id
  join public.user_books ub on ub.id = e.user_book_id and ub.user_id = x.user_id
  join public.books b on b.id = ub.book_id
  where i.excerpt_id = p_id
    and e.is_private is false
    and e.quote ~ '[^[:space:]]'
  order by i.position;
$$;
revoke all on function public.monthly_excerpt_visible_items(uuid) from public, anon, authenticated;

-- 이 권을 지금 볼 수 있는가: 소유자이거나, 친구이고 공개 중이며 공개 문장이 1개 이상.
create or replace function public.can_view_monthly_excerpt(p_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.monthly_excerpts x
    where x.id = p_id
      and (
        x.user_id = (select auth.uid())
        or (
          x.is_shared
          and public.is_friend_with(x.user_id)
          and exists (select 1 from public.monthly_excerpt_visible_items(x.id))
        )
      )
  );
$$;
revoke all on function public.can_view_monthly_excerpt(uuid) from public, anon;
grant execute on function public.can_view_monthly_excerpt(uuid) to authenticated;

-- 친구가 읽는 한 권. 내 화면의 형태에서 isPrivate와 firstSharedAt을 뺐다. 볼 수 없으면 null이다.
create or replace function public.get_friend_monthly_excerpt(p_owner uuid, p_month text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  if not public.is_friend_with(p_owner) then return null; end if;
  -- monthly_excerpt_month_start는 잘못된 달에 예외를 던진다. 친구 RPC는 빈 결과로 통일한다.
  if coalesce(p_month, '') !~ '^[1-9][0-9]{3}-(0[1-9]|1[0-2])$' then return null; end if;

  select jsonb_build_object(
    'id', x.id,
    'month', to_char(x.month, 'YYYY-MM'),
    'isShared', x.is_shared,
    'items', a.items
  ) into v_result
  from public.monthly_excerpts x
  cross join lateral (
    select jsonb_agg(jsonb_build_object(
      'position', v.item_position,
      'entryId', v.entry_id,
      'date', v.entry_date,
      'quote', v.quote,
      'note', v.note,
      'fromPage', v.from_page,
      'toPage', v.to_page,
      'book', jsonb_build_object('id', v.book_id, 'title', v.book_title, 'author', v.book_author)
    ) order by v.item_position) as items
    from public.monthly_excerpt_visible_items(x.id) v
  ) a
  where x.user_id = p_owner
    and x.month = (p_month || '-01')::date
    and x.is_shared
    and a.items is not null;

  return v_result;
end;
$$;
revoke all on function public.get_friend_monthly_excerpt(uuid, text) from public, anon;
grant execute on function public.get_friend_monthly_excerpt(uuid, text) to authenticated;

-- 친구의 모아 보기 해 목록: 볼 수 있는 권이 있는 해만, 최신 해 먼저. 엮지 않은 달은 알리지 않는다.
create or replace function public.get_friend_monthly_excerpt_years(p_owner uuid)
returns table (year int, excerpt_count int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_friend_with(p_owner) then return; end if;

  return query
    select extract(year from x.month)::integer, count(*)::integer
    from public.monthly_excerpts x
    where x.user_id = p_owner
      and x.is_shared
      and exists (select 1 from public.monthly_excerpt_visible_items(x.id))
    group by 1
    order by 1 desc;
end;
$$;
revoke all on function public.get_friend_monthly_excerpt_years(uuid) from public, anon;
grant execute on function public.get_friend_monthly_excerpt_years(uuid) to authenticated;

-- 친구의 모아 보기 한 해: 최신 달 먼저. 문장 수와 표지는 친구에게 보이는 문장 기준이다.
-- make_date 대신 extract로 거르므로 범위 밖의 해도 예외 없이 빈 목록이다.
create or replace function public.get_friend_monthly_excerpt_year(p_owner uuid, p_year int)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_friend_with(p_owner) then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'month', to_char(x.month, 'YYYY-MM'),
      'quoteCount', a.quote_count,
      'excerptId', x.id,
      'coverQuote', a.cover_quote
    ) order by x.month desc)
    from public.monthly_excerpts x
    cross join lateral (
      select count(*)::integer as quote_count,
             (array_agg(v.quote order by v.item_position))[1] as cover_quote
      from public.monthly_excerpt_visible_items(x.id) v
    ) a
    where x.user_id = p_owner
      and x.is_shared
      and extract(year from x.month) = p_year
      and a.quote_count > 0
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_friend_monthly_excerpt_year(uuid, int) from public, anon;
grant execute on function public.get_friend_monthly_excerpt_year(uuid, int) to authenticated;

commit;
