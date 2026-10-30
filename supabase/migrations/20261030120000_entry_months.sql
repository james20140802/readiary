-- 기록 꺼내기 '한 달' 시트의 달 후보: 기록을 남긴 달과 그달의 기록 수만 센다.
-- 기록 행을 내려보내지 않는다. 늘 로그인한 사람 자신의 기록만, 기록 날짜(entries.date) 기준으로 센다.
create or replace function public.get_entry_months()
returns table (month text, entry_count integer)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  return query
    select to_char(e.date, 'YYYY-MM'), count(*)::integer
    from public.entries e
    join public.user_books ub on ub.id = e.user_book_id
    where ub.user_id = (select auth.uid())
    group by 1
    order by 1 desc;
end;
$$;

revoke all on function public.get_entry_months() from public, anon;
grant execute on function public.get_entry_months() to authenticated;
