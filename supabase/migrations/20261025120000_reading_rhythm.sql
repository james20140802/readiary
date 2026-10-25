-- 나 화면 '언제 읽었나': 기록을 남긴 시각을 달(KST) × 요일 × 시간대 칸으로 센다.
-- 기록 행을 내려보내지 않고 칸별 개수만 돌려준다. 늘 로그인한 사람 자신의 기록만 센다.
-- 시간대: 5–11시 아침(0), 11–17시 낮(1), 17–21시 저녁(2), 그 밖은 밤(3). lib/profile/readingRhythm.ts와 같은 규칙.
create or replace function public.reading_rhythm(p_since timestamptz)
returns table (month text, day smallint, slot smallint, count integer)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if p_since is null or p_since < now() - interval '13 months' then
    raise exception 'Invalid rhythm range';
  end if;
  return query
    with stamps as (
      select e.created_at at time zone 'Asia/Seoul' as kst
      from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      where ub.user_id = (select auth.uid())
        and e.created_at >= p_since
    )
    select
      to_char(kst, 'YYYY-MM'),
      (extract(isodow from kst)::int - 1)::smallint,
      (case
        when extract(hour from kst) >= 5 and extract(hour from kst) < 11 then 0
        when extract(hour from kst) >= 11 and extract(hour from kst) < 17 then 1
        when extract(hour from kst) >= 17 and extract(hour from kst) < 21 then 2
        else 3
      end)::smallint,
      count(*)::integer
    from stamps
    group by 1, 2, 3;
end;
$$;

revoke all on function public.reading_rhythm(timestamptz) from public, anon;
grant execute on function public.reading_rhythm(timestamptz) to authenticated;
