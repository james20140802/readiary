-- Add record identifiers without breaking existing quote consumers. Caller RLS and preview bounds remain unchanged.
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
      select count(*) n from visible v where v.user_book_id=ub.id and nullif(btrim(v.quote, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), '') is not null
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
        select btrim(v.quote, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') as quote,v.date,v.created_at,v.id from visible v
        where v.date>=m.start and v.date<m.start+interval '1 month' and nullif(btrim(v.quote, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), '') is not null
        order by v.date desc,v.created_at desc,v.id desc limit 3) q),'[]'::jsonb),
      'quotePreviews',coalesce((select jsonb_agg(jsonb_build_object('entryId',q.id,'quote',q.quote) order by q.date desc,q.created_at desc,q.id desc) from (
        select btrim(v.quote, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') as quote,v.date,v.created_at,v.id from visible v
        where v.date>=m.start and v.date<m.start+interval '1 month' and nullif(btrim(v.quote, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), '') is not null
        order by v.date desc,v.created_at desc,v.id desc limit 3) q),'[]'::jsonb)
    ) order by m.start desc) from months m)
  );
$$;
