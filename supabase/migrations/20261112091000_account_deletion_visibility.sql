-- 계정 탈퇴 2: 유예 중인 계정을 다른 사람에게서 숨긴다.
-- 친구·모르는 사람·외부 공유 링크 모두에게 보이지 않고, 탈퇴를 취소하면 그대로 다시 보인다.
-- 데이터는 지우지 않는다. 읽기 경로에만 is_account_active 조건을 더한다. 쓰기 차단은 뒤이은 마이그레이션이 맡는다.

-- 1) 친구 판정: 상대가 유예 중이면 친구가 아니다.
--    이 함수에 기대는 entries·user_books·entry_reflections 정책과 invoker RPC
--    (get_social_feed, get_social_feed_items, get_profile_retrospect, get_reading_stats, get_featured_bookmark)가 함께 따라온다.
create or replace function public.is_friend_with(p_user_id uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.is_account_active(p_user_id) and exists (
    select 1
    from public.friends f
    where f.status = 'accepted'
      and (
        (f.user_id = (select auth.uid()) and f.friend_id = p_user_id)
        or (f.friend_id = (select auth.uid()) and f.user_id = p_user_id)
      )
  );
$$;
revoke all on function public.is_friend_with(uuid) from public, anon;
grant execute on function public.is_friend_with(uuid) to authenticated, service_role;

-- 2) 남의 행을 읽는 테이블에 restrictive SELECT 정책을 더한다. 기존 permissive 정책과 AND로 묶인다.
--    본인 행은 그대로 보인다(유예 중인 본인이 자기 프로필을 읽어 복구 화면으로 간다).
create policy profiles_hide_pending_deletion on public.profiles
  as restrictive for select to authenticated
  using (id = (select auth.uid()) or public.is_account_active(id));

create policy comments_hide_pending_deletion on public.comments
  as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or public.is_account_active(user_id));

create policy likes_hide_pending_deletion on public.likes
  as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or public.is_account_active(user_id));

create policy monthly_excerpt_comments_hide_pending_deletion on public.monthly_excerpt_comments
  as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or public.is_account_active(user_id));

create policy monthly_excerpt_likes_hide_pending_deletion on public.monthly_excerpt_likes
  as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or public.is_account_active(user_id));

-- 친구 관계는 상대가 활성일 때만 보인다. 유예 중인 상대와의 관계 행만 숨는다.
create policy friends_hide_pending_deletion on public.friends
  as restrictive for select to authenticated
  using (
    (user_id = (select auth.uid()) and public.is_account_active(friend_id))
    or (friend_id = (select auth.uid()) and public.is_account_active(user_id))
  );

-- 유예 중인 사람이 남긴 소식은 숨긴다.
create policy notifications_hide_pending_deletion on public.notifications
  as restrictive for select to authenticated
  using (public.is_account_active(actor_id));

-- 3) RLS를 거치지 않는 definer 읽기 함수에 소유자 활성 조건을 더한다. 본문은 최신 정의 그대로다.

-- 볼 수 있는 권: 본인 것이거나, 공개했고 친구이며(is_friend_with가 활성도 본다) 보일 문장이 있다.
-- 본인 분기는 그대로 둔다. 유예 중인 본인이 자기 권을 읽는 것은 막지 않는다.
create or replace function public.can_view_monthly_excerpt(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.monthly_excerpts x
    where x.id = p_id
      and (
        x.user_id = (select auth.uid())
        or (
          x.is_shared
          and public.is_account_active(x.user_id)
          and public.is_friend_with(x.user_id)
          and exists (select 1 from public.monthly_excerpt_visible_items(x.id))
        )
      )
  );
$$;
revoke all on function public.can_view_monthly_excerpt(uuid) from public, anon;
grant execute on function public.can_view_monthly_excerpt(uuid) to authenticated, service_role;

-- 친구 피드의 발췌집: 유예 중인 친구의 권은 빼고, 좋아요·댓글 수에서도 유예 중인 사람의 반응은 뺀다.
create or replace function public.friend_feed_monthly_excerpts(p_limit bigint)
returns table (
  id uuid, user_id uuid, month date, first_shared_at timestamptz,
  cover_quote text, cover_book_title text, quote_count integer, book_count integer,
  liked boolean, like_count integer, comment_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with friend_ids as (
    select f.friend_id as id from public.friends f where f.user_id = (select auth.uid()) and f.status = 'accepted'
    union
    select f.user_id from public.friends f where f.friend_id = (select auth.uid()) and f.status = 'accepted'
  ), picked as materialized (
    select x.id, x.user_id, x.month, x.first_shared_at
    from public.monthly_excerpts x
    where x.user_id in (select fi.id from friend_ids fi)
      and x.user_id <> (select auth.uid())
      and x.is_shared
      and x.first_shared_at is not null
      and public.is_account_active(x.user_id)
      and exists (select 1 from public.monthly_excerpt_visible_items(x.id))
    order by x.first_shared_at desc, x.id desc
    limit greatest(coalesce(p_limit, 0), 0)
  )
  select
    x.id, x.user_id, x.month, x.first_shared_at,
    a.cover_quote, a.cover_book_title, a.quote_count, a.book_count,
    exists (
      select 1 from public.monthly_excerpt_likes l
      where l.excerpt_id = x.id and l.user_id = (select auth.uid())
    ),
    (select count(*)::integer from public.monthly_excerpt_likes l
      where l.excerpt_id = x.id and public.is_account_active(l.user_id)),
    (select count(*)::integer from public.monthly_excerpt_comments c
      where c.excerpt_id = x.id and public.is_account_active(c.user_id))
  from picked x
  cross join lateral (
    select
      (array_agg(v.quote order by v.item_position))[1] as cover_quote,
      (array_agg(v.book_title order by v.item_position))[1] as cover_book_title,
      count(*)::integer as quote_count,
      count(distinct v.book_id)::integer as book_count
    from public.monthly_excerpt_visible_items(x.id) v
  ) a
  order by x.first_shared_at desc, x.id desc;
$$;
revoke all on function public.friend_feed_monthly_excerpts(bigint) from public, anon;
grant execute on function public.friend_feed_monthly_excerpts(bigint) to authenticated, service_role;

create or replace function public.get_friend_monthly_excerpt(p_owner uuid, p_month text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_account_active(p_owner) then return null; end if;
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
grant execute on function public.get_friend_monthly_excerpt(uuid, text) to authenticated, service_role;

create or replace function public.get_friend_monthly_excerpt_year(p_owner uuid, p_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_account_active(p_owner) then return '[]'::jsonb; end if;
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
revoke all on function public.get_friend_monthly_excerpt_year(uuid, integer) from public, anon;
grant execute on function public.get_friend_monthly_excerpt_year(uuid, integer) to authenticated, service_role;

create or replace function public.get_friend_monthly_excerpt_years(p_owner uuid)
returns table (year integer, excerpt_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_account_active(p_owner) then return; end if;
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
grant execute on function public.get_friend_monthly_excerpt_years(uuid) to authenticated, service_role;

-- 반응 수: 권의 소유자는 can_view_monthly_excerpt가 본다. 반응한 사람도 활성이어야 센다.
-- liked는 본인 것이므로 그대로 둔다.
create or replace function public.get_monthly_excerpt_reactions(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_view_monthly_excerpt(p_id) then
    return null;
  end if;
  return jsonb_build_object(
    'likeCount', (select count(*)::integer from public.monthly_excerpt_likes l
      where l.excerpt_id = p_id and public.is_account_active(l.user_id)),
    'commentCount', (select count(*)::integer from public.monthly_excerpt_comments c
      where c.excerpt_id = p_id and public.is_account_active(c.user_id)),
    'liked', exists (
      select 1 from public.monthly_excerpt_likes l
      where l.excerpt_id = p_id and l.user_id = (select auth.uid())
    )
  );
end;
$$;
revoke all on function public.get_monthly_excerpt_reactions(uuid) from public, anon;
grant execute on function public.get_monthly_excerpt_reactions(uuid) to authenticated, service_role;

-- 외부 공유 링크: 기록 주인이 유예 중이면 비로그인에게도 보이지 않는다.
-- anon은 is_account_active를 실행할 수 없지만 definer 함수 안에서 부르므로 괜찮다.
create or replace function public.get_public_entry(p_entry_id uuid)
returns table (
  id uuid, quote text, note text, date date,
  book_title text, book_author text, nickname text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.quote, e.note, e.date, b.title, b.author, p.nickname
  from public.entries e
  join public.user_books ub on ub.id = e.user_book_id
  join public.books b on b.id = ub.book_id
  join public.profiles p on p.id = ub.user_id
  where e.id = p_entry_id and e.is_private = false and e.shared_at is not null
    and public.is_account_active(ub.user_id);
$$;
revoke all on function public.get_public_entry(uuid) from public;
grant execute on function public.get_public_entry(uuid) to anon, authenticated, service_role;
