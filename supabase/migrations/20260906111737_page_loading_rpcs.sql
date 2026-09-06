-- Read-only page RPCs. Identity comes from auth.uid(); existing RLS remains authoritative.
-- Deploy before the application: additive functions/indexes, no changes to writes or policies.
create index if not exists user_books_user_created_idx on public.user_books(user_id, created_at desc, id);
create index if not exists entries_book_created_idx on public.entries(user_book_id, created_at desc, id desc);
create index if not exists entries_book_date_idx on public.entries(user_book_id, date, created_at, id);
create index if not exists friends_recipient_status_idx on public.friends(friend_id, status, user_id);

create or replace function public.get_dashboard_core(p_today date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with owned as materialized (
    select ub.* from public.user_books ub where ub.user_id = (select auth.uid())
  ), reading as (
    select ub.id, ub.book_id, ub.progress, ub.created_at, ub.is_finished, ub.last_read_page,
      jsonb_build_object('id', b.id, 'title', b.title, 'author', b.author,
        'cover_url', b.cover_url, 'total_pages', b.total_pages, 'isbn', b.isbn) as books
    from owned ub join public.books b on b.id = ub.book_id where ub.is_finished = false
  ), week as (
    select e.date, count(*) as n from public.entries e join owned ub on ub.id = e.user_book_id
    where e.date >= p_today - extract(dow from p_today)::int
      and e.date < p_today - extract(dow from p_today)::int + 7 group by e.date
  ), recent as (
    select e.id, e.quote, e.note, e.date, coalesce(to_jsonb(e.created_at), to_jsonb(e.date)) as "createdAt",
      e.user_book_id as "userBookId", b.title as "bookTitle", b.author as "bookAuthor"
    from public.entries e join owned ub on ub.id = e.user_book_id join public.books b on b.id = ub.book_id
    order by e.created_at desc, e.id desc limit 6
  )
  select jsonb_build_object(
    'name', (select p.name from public.profiles p where p.id = (select auth.uid())),
    'books', coalesce((select jsonb_agg(r order by r.created_at desc, r.id) from reading r), '[]'::jsonb),
    'todayKst', p_today,
    'weeklyCount', coalesce((select sum(n) from week), 0),
    'weekActivity', (select jsonb_agg(exists(select 1 from week w where w.date = p_today - extract(dow from p_today)::int + d) order by d) from generate_series(0,6) d),
    'recentUserBookId', (select e.user_book_id from public.entries e join owned ub on ub.id=e.user_book_id order by e.created_at desc, e.id desc limit 1),
    'recentEntries', coalesce((select jsonb_agg(r order by r."createdAt" desc, r.id desc) from recent r), '[]'::jsonb),
    'latestTexts', coalesce((select jsonb_object_agg(ub.id, t.text) from owned ub
      cross join lateral (select coalesce(e.quote,e.note) as text from public.entries e
        where e.user_book_id=ub.id and (e.quote is not null or e.note is not null)
        order by e.created_at desc, e.id desc limit 1) t where ub.is_finished=false), '{}'::jsonb)
  ) where (select auth.uid()) is not null;
$$;

create or replace function public.get_reading_stats(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with owned as materialized (select id, is_finished from public.user_books where user_id=p_user_id)
  select jsonb_build_object(
    'totalBooks', (select count(*) from owned),
    'finishedBooks', (select count(*) from owned where is_finished),
    'totalEntries', count(*),
    'totalPages', coalesce(sum(case when e.from_page is not null and e.to_page is not null
      then greatest(0, e.to_page::bigint-e.from_page+1) else 0 end), 0)
  ) from public.entries e join owned ub on ub.id=e.user_book_id;
$$;

create or replace function public.get_book_reading_stats()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(s.user_book_id, jsonb_build_object(
    'firstDate',s.first_date,'lastDate',s.last_date,'entryCount',s.n)), '{}'::jsonb)
  from (select e.user_book_id,min(e.date) first_date,max(e.date) last_date,count(*) n
    from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where ub.user_id=(select auth.uid()) group by e.user_book_id) s;
$$;

create or replace function public.get_social_feed(p_page integer default 0, p_limit integer default 10)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with friend_ids as (
    select friend_id as id from public.friends where user_id=(select auth.uid()) and status='accepted'
    union select user_id from public.friends where friend_id=(select auth.uid()) and status='accepted'
  ), page as materialized (
    select e.*, ub.user_id, ub.book_id from public.entries e
    join public.user_books ub on ub.id=e.user_book_id
    where ub.user_id in (select id from friend_ids) and e.is_private=false
    order by e.created_at desc, e.id desc
    limit least(greatest(coalesce(p_limit,10),1),50)
    offset (least(greatest(coalesce(p_page,0),0),100000)::bigint * least(greatest(coalesce(p_limit,10),1),50))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'entry',jsonb_build_object('id',e.id,'date',e.date,'quote',e.quote,'note',e.note,
      'from_page',e.from_page,'to_page',e.to_page,'is_private',false,
      'created_at',coalesce(to_jsonb(e.created_at),to_jsonb(e.date)),
      'book',jsonb_build_object('id',b.id,'title',b.title,'author',b.author,'cover_url',b.cover_url,'total_pages',b.total_pages)),
    'profile',jsonb_build_object('id',p.id,'name',p.name,'nickname',p.nickname,'tag',p.tag,
      'bio',p.bio,'profile_image',p.profile_image,'created_at',p.created_at),
    'initialLiked',exists(select 1 from public.likes l where l.entry_id=e.id and l.user_id=(select auth.uid())),
    'initialLikeCount',(select count(*) from public.likes l where l.entry_id=e.id),
    'initialCommentCount',(select count(*) from public.comments c where c.entry_id=e.id)
  ) order by e.created_at desc, e.id desc),'[]'::jsonb)
  from page e join public.books b on b.id=e.book_id join public.profiles p on p.id=e.user_id;
$$;

create or replace function public.get_monthly_recap(p_today date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select case when count(*)=0 then null else jsonb_build_object(
    'label',to_char(date_trunc('month',p_today)-interval '1 month','YYYY년 FMMM월'),
    'entryCount',count(*),'quoteCount',count(*) filter(where e.quote ~ '[^[:space:]]'),
    'bookCount',count(distinct e.user_book_id)) end
  from public.entries e join public.user_books ub on ub.id=e.user_book_id
  where ub.user_id=(select auth.uid()) and extract(day from p_today)=1
    and e.date >= (date_trunc('month',p_today)-interval '1 month')::date
    and e.date < date_trunc('month',p_today)::date;
$$;

-- Same deterministic selection as selectRecall.ts, including the unsigned 32-bit seed.
create or replace function public.get_recall_entry(p_today date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_entry public.entries%rowtype;
  v_seed bigint := 0;
  v_key text;
  v_count bigint;
  i integer;
begin
  if v_user is null then return null; end if;
  select e.* into v_entry from public.entries e join public.user_books ub on ub.id=e.user_book_id
    where ub.user_id=v_user and e.quote is not null and e.date<p_today
      and to_char(e.date,'MM-DD')=to_char(p_today,'MM-DD')
    order by e.date,e.created_at,e.id limit 1;
  if not found then
    select count(*) into v_count from public.entries e join public.user_books ub on ub.id=e.user_book_id
      where ub.user_id=v_user and e.quote is not null and e.date<=p_today-7;
    if v_count=0 then return null; end if;
    v_key := v_user::text || '|' || p_today::text;
    for i in 1..length(v_key) loop
      v_seed := (v_seed*31+ascii(substr(v_key,i,1))) % 4294967296;
    end loop;
    select e.* into v_entry from public.entries e join public.user_books ub on ub.id=e.user_book_id
      where ub.user_id=v_user and e.quote is not null and e.date<=p_today-7
      order by e.date,e.created_at,e.id limit 1 offset (v_seed % v_count);
  end if;
  if v_entry.quote is null or v_entry.quote='' then return null; end if;
  return (select jsonb_build_object('id',v_entry.id,'date',v_entry.date,'quote',v_entry.quote,
    'bookTitle',b.title,'bookAuthor',b.author,'yearsAgo',
    case when to_char(v_entry.date,'MM-DD')=to_char(p_today,'MM-DD')
      then extract(year from p_today)::int-extract(year from v_entry.date)::int else null end)
    from public.user_books ub join public.books b on b.id=ub.book_id
    where ub.id=v_entry.user_book_id and b.title<>'');
end;
$$;

create or replace function public.get_books_page()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('books',coalesce((select jsonb_agg(jsonb_build_object(
    'id',ub.id,'book_id',ub.book_id,'progress',ub.progress,'created_at',ub.created_at,
    'is_finished',ub.is_finished,'last_read_page',ub.last_read_page,
    'books',jsonb_build_object('id',b.id,'title',b.title,'author',b.author,'cover_url',b.cover_url,
      'total_pages',b.total_pages,'isbn',b.isbn)) order by ub.created_at desc,ub.id)
    from public.user_books ub join public.books b on b.id=ub.book_id
    where ub.user_id=(select auth.uid())),'[]'::jsonb), 'stats',public.get_book_reading_stats());
$$;

create or replace function public.get_profile_retrospect(p_user_id uuid, p_today date, p_public_only boolean default false)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with owned as materialized (
    select ub.*,b.title,b.cover_url from public.user_books ub join public.books b on b.id=ub.book_id where ub.user_id=p_user_id
  ), visible as materialized (
    select e.id,e.user_book_id,e.date,e.created_at,e.quote,ub.title
    from public.entries e join owned ub on ub.id=e.user_book_id
    where not coalesce(p_public_only,false) or e.is_private=false
  ), finished as (
    select ub.book_id as "bookId",ub.title,ub.cover_url as "coverUrl",q.n as "quoteCount",
      coalesce(ub.finished_at,ub.created_at) as finished_order,ub.id
    from owned ub cross join lateral (
      select count(*) n from visible v where v.user_book_id=ub.id and v.quote ~ '[^[:space:]]'
    ) q where ub.is_finished and ub.title<>'' and q.n>0
  ), months as (
    select (date_trunc('month',p_today)-i*interval '1 month')::date as start from generate_series(0,5) i
  )
  select jsonb_build_object(
    'finishedBooks',coalesce((select jsonb_agg(to_jsonb(f)-'finished_order'-'id' order by f.finished_order desc nulls last,f.id) from finished f),'[]'::jsonb),
    'monthly',(select jsonb_agg(jsonb_build_object(
      'label',to_char(m.start,'YYYY년 FMMM월'),
      'count',(select count(*) from visible v where v.date>=m.start and v.date<m.start+interval '1 month'),
      'books',coalesce((select jsonb_agg(t.title order by t.date desc,t.created_at desc,t.id desc) from (
        select * from (select distinct on (v.title) v.title,v.date,v.created_at,v.id
          from visible v where v.date>=m.start and v.date<m.start+interval '1 month' and v.title<>''
          order by v.title,v.date desc,v.created_at desc,v.id desc) titles
        order by date desc,created_at desc,id desc limit 6) t),'[]'::jsonb),
      'quotes',coalesce((select jsonb_agg(q.quote order by q.date desc,q.created_at desc,q.id desc) from (
        select regexp_replace(v.quote,'^[[:space:]]+|[[:space:]]+$','','g') as quote,v.date,v.created_at,v.id from visible v
        where v.date>=m.start and v.date<m.start+interval '1 month' and v.quote ~ '[^[:space:]]'
        order by v.date desc,v.created_at desc,v.id desc limit 3) q),'[]'::jsonb)
    ) order by m.start desc) from months m)
  );
$$;

create or replace function public.get_featured_bookmark(p_user_book_id uuid, p_owner_id uuid, p_public_only boolean default false)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with book as (
    select ub.id,ub.book_id,b.title from public.user_books ub join public.books b on b.id=ub.book_id
    where ub.id=p_user_book_id and ub.user_id=p_owner_id and ub.is_finished and b.title<>''
  ), quotes as materialized (
    select e.quote,e.date,e.created_at,e.id from public.entries e join book b on b.id=e.user_book_id
    where e.quote ~ '[^[:space:]]' and (not coalesce(p_public_only,false) or e.is_private=false)
  )
  select jsonb_build_object('userBookId',b.id,'bookId',b.book_id,'title',b.title,
    'quoteCount',(select count(*) from quotes),
    'quotes',coalesce((select jsonb_agg(q.quote order by q.date,q.created_at,q.id)
      from (select * from quotes order by date,created_at,id limit 3) q),'[]'::jsonb)) from book b;
$$;

revoke all on function public.get_books_page(), public.get_profile_retrospect(uuid,date,boolean),
  public.get_featured_bookmark(uuid,uuid,boolean) from public, anon;
grant execute on function public.get_books_page(), public.get_profile_retrospect(uuid,date,boolean),
  public.get_featured_bookmark(uuid,uuid,boolean) to authenticated;

revoke all on function public.get_dashboard_core(date), public.get_reading_stats(uuid),
  public.get_book_reading_stats(), public.get_social_feed(integer,integer),
  public.get_monthly_recap(date), public.get_recall_entry(date) from public, anon;
grant execute on function public.get_dashboard_core(date), public.get_reading_stats(uuid),
  public.get_book_reading_stats(), public.get_social_feed(integer,integer),
  public.get_monthly_recap(date), public.get_recall_entry(date) to authenticated;
