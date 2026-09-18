-- Search is always scoped to the authenticated owner's library, including private entries.
-- Literal substring matching: no LIKE wildcards, regular expressions, or external search service.
create or replace function public.search_excerpt(p_text text, p_query text)
returns text language sql immutable set search_path = '' as $$
  select case when p_text is null or strpos(lower(p_text), lower(p_query)) = 0 then null
    else (case when strpos(lower(p_text),lower(p_query)) > 80 then '…' else '' end)
      || substring(p_text from greatest(1, strpos(lower(p_text),lower(p_query)) - 80) for greatest(240, char_length(p_query) + 160))
      || (case when char_length(p_text) > greatest(1, strpos(lower(p_text),lower(p_query)) - 80) + greatest(240, char_length(p_query) + 160) - 1 then '…' else '' end)
    end;
$$;

create or replace function public.search_library(
  p_query text, p_kind text, p_book_id uuid default null,
  p_from date default null, p_to date default null, p_cursor jsonb default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_query text := btrim(p_query);
  v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if p_query is null or char_length(p_query) > 200 or p_kind is null or p_kind not in ('books','entries','candidates')
    or (v_query = '' and p_kind <> 'candidates') or p_from > p_to then
    raise exception 'Invalid search request';
  end if;
  if p_kind in ('books','candidates') then
    with matches as (
      select ub.id, ub.book_id, b.title, b.author, b.cover_url,
        coalesce(ub.created_at, '1970-01-01'::timestamptz) as created
      from public.user_books ub join public.books b on b.id = ub.book_id
      where ub.user_id = (select auth.uid())
        and (v_query = '' or strpos(lower(b.title),lower(v_query)) > 0 or strpos(lower(coalesce(b.author,'')),lower(v_query)) > 0)
        and (p_cursor is null or (coalesce(ub.created_at, '1970-01-01'::timestamptz), ub.id) < ((p_cursor->>'created')::timestamptz, (p_cursor->>'id')::uuid))
      order by created desc, ub.id desc limit 21
    ), page as (select * from matches order by created desc, id desc limit 20)
    select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'bookId',book_id,'title',title,'author',author,'coverUrl',cover_url
    ) order by created desc,id desc) from page),'[]'::jsonb),
    'next', case when (select count(*) from matches) > 20 then
      (select jsonb_build_object('id',id,'created',created) from page order by created,id limit 1) else null end) into v_result;
  else
    with matches as (
      select e.id, ub.book_id, b.title, e.date, e.from_page, e.to_page, e.quote, e.note,
        coalesce(e.created_at, '1970-01-01'::timestamptz) as created
      from public.entries e join public.user_books ub on ub.id=e.user_book_id join public.books b on b.id=ub.book_id
      where ub.user_id=(select auth.uid())
        and (p_book_id is null or ub.id=p_book_id)
        and (p_from is null or e.date >= p_from) and (p_to is null or e.date <= p_to)
        and (strpos(lower(coalesce(e.quote,'')),lower(v_query)) > 0 or strpos(lower(coalesce(e.note,'')),lower(v_query)) > 0)
        and (p_cursor is null or (e.date,coalesce(e.created_at,'1970-01-01'::timestamptz),e.id) < ((p_cursor->>'date')::date,(p_cursor->>'created')::timestamptz,(p_cursor->>'id')::uuid))
      order by e.date desc, created desc, e.id desc limit 21
    ), page as (select * from matches order by date desc,created desc,id desc limit 20)
    select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'bookId',book_id,'title',title,'date',date,'fromPage',from_page,'toPage',to_page,
      'quote',public.search_excerpt(quote,v_query),'note',public.search_excerpt(note,v_query)
    ) order by date desc,created desc,id desc) from page),'[]'::jsonb),
    'next',case when (select count(*) from matches)>20 then
      (select jsonb_build_object('id',id,'created',created,'date',date) from page order by date,created,id limit 1) else null end) into v_result;
  end if;
  return v_result;
end;
$$;
revoke all on function public.search_library(text,text,uuid,date,date,jsonb) from public, anon;
grant execute on function public.search_library(text,text,uuid,date,date,jsonb) to authenticated;
