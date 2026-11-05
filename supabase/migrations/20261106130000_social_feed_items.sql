-- 친구 피드: 기록과 달의 발췌집을 시각 내림차순으로 섞어 한 쪽씩 읽는다. 발췌집은 처음 공개한 시각에 한 번만 뜬다.
-- 새 함수만 더하므로 옛 코드가 돌아가는 동안 먼저 적용해도 안전하다. 코드 배포 전에 적용한다.
-- 옛 get_social_feed는 새 코드 배포가 끝날 때까지 롤백을 위해 남겨 둔다. 배포를 확인한 뒤 후속 작업에서 지운다.
begin;

-- 지금 로그인한 사람의 친구들이 공개한 발췌집 중 최근 것부터 p_limit권.
-- 표·반응 정책은 소유자 전용이거나 행마다 친구 관계를 다시 재므로, 친구 피드의 길을 여기 한 곳에 둔다.
-- 보는 사람은 인자로 받지 않고 auth.uid()로만 정한다. 친구 관계는 is_friend_with와 같은 조건이지만,
-- 행마다 부르면 모든 공개 권을 훑게 되므로 친구 목록에서 출발해 (user_id, month) 인덱스를 탄다.
-- 예외적으로 authenticated에 실행 권한을 준다: 호출자 권한으로 도는 get_social_feed_items가 부르기 때문이다.
-- 직접 불러도 그 사람이 피드에서 받는 카드 내용과 같아서 더 알아낼 것이 없다.
create or replace function public.friend_feed_monthly_excerpts(p_limit bigint)
returns table (
  id uuid,
  user_id uuid,
  month date,
  first_shared_at timestamptz,
  cover_quote text,
  cover_book_title text,
  quote_count integer,
  book_count integer,
  liked boolean,
  like_count integer,
  comment_count integer
)
language sql stable security definer set search_path = '' as $$
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
    (select count(*)::integer from public.monthly_excerpt_likes l where l.excerpt_id = x.id),
    (select count(*)::integer from public.monthly_excerpt_comments c where c.excerpt_id = x.id)
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
grant execute on function public.friend_feed_monthly_excerpts(bigint) to authenticated;

-- 기록은 호출자 권한으로 읽어 기존 RLS를 그대로 탄다. 항목은 kind로 가른다.
-- 합친 뒤 끊으므로 양쪽에서 (쪽 번호 + 1) × 크기만큼 가져오면 그 쪽을 만들 수 있다.
create or replace function public.get_social_feed_items(p_page integer default 0, p_limit integer default 10)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with bounds as materialized (
    select
      least(greatest(coalesce(p_limit, 10), 1), 50)::bigint as size,
      least(greatest(coalesce(p_page, 0), 0), 100000)::bigint as page
  ), friend_ids as (
    select friend_id as id from public.friends where user_id = (select auth.uid()) and status = 'accepted'
    union select user_id from public.friends where friend_id = (select auth.uid()) and status = 'accepted'
  ), entry_keys as materialized (
    select e.id, e.created_at as at
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    where ub.user_id in (select id from friend_ids) and e.is_private = false
    order by e.created_at desc, e.id desc
    limit (select (page + 1) * size from bounds)
  ), excerpts as materialized (
    select * from public.friend_feed_monthly_excerpts((select (page + 1) * size from bounds))
  ), page_keys as materialized (
    select 'entry'::text as kind, k.id, k.at from entry_keys k
    union all
    select 'monthly_excerpt', x.id, x.first_shared_at from excerpts x
    order by at desc, id desc
    limit (select size from bounds)
    offset (select page * size from bounds)
  )
  select coalesce(jsonb_agg(i.item order by k.at desc, k.id desc), '[]'::jsonb)
  from page_keys k
  cross join lateral (
    select case k.kind
      when 'entry' then (
        select jsonb_build_object(
          'kind', 'entry',
          'entry', jsonb_build_object('id', e.id, 'date', e.date, 'quote', e.quote, 'note', e.note,
            'from_page', e.from_page, 'to_page', e.to_page, 'is_private', false,
            'created_at', coalesce(to_jsonb(e.created_at), to_jsonb(e.date)),
            'book', jsonb_build_object('id', b.id, 'title', b.title, 'author', b.author,
              'cover_url', b.cover_url, 'total_pages', b.total_pages)),
          'profile', jsonb_build_object('id', p.id, 'name', p.name, 'nickname', p.nickname, 'tag', p.tag,
            'bio', p.bio, 'profile_image', p.profile_image, 'created_at', p.created_at),
          'initialLiked', exists (select 1 from public.likes l where l.entry_id = e.id and l.user_id = (select auth.uid())),
          'initialLikeCount', (select count(*) from public.likes l where l.entry_id = e.id),
          'initialCommentCount', (select count(*) from public.comments c where c.entry_id = e.id)
        )
        from public.entries e
        join public.user_books ub on ub.id = e.user_book_id
        join public.books b on b.id = ub.book_id
        join public.profiles p on p.id = ub.user_id
        where e.id = k.id
      )
      else (
        select jsonb_build_object(
          'kind', 'monthly_excerpt',
          'id', x.id,
          'month', to_char(x.month, 'YYYY-MM'),
          'sharedAt', x.first_shared_at,
          'profile', jsonb_build_object('id', p.id, 'name', p.name, 'nickname', p.nickname, 'tag', p.tag,
            'bio', p.bio, 'profile_image', p.profile_image, 'created_at', p.created_at),
          'coverQuote', x.cover_quote,
          'coverBookTitle', x.cover_book_title,
          'quoteCount', x.quote_count,
          'bookCount', x.book_count,
          'initialLiked', x.liked,
          'initialLikeCount', x.like_count,
          'initialCommentCount', x.comment_count
        )
        from excerpts x
        join public.profiles p on p.id = x.user_id
        where x.id = k.id
      )
    end as item
  ) i
  where i.item is not null;
$$;
revoke all on function public.get_social_feed_items(integer, integer) from public, anon;
grant execute on function public.get_social_feed_items(integer, integer) to authenticated;

commit;
