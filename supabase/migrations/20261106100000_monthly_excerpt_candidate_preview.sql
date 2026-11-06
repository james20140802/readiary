-- 엮기 미리보기가 후보 데이터만으로 한 페이지를 그리도록, 후보에 생각 본문과 책 정보를 더한다.
-- 같은 서명(text, uuid, int, int)의 create or replace이고 키만 늘린다. 옛 코드는 모르는 키를 무시하므로
-- 코드 배포보다 먼저 적용해도 안전하다. 내 기록만 돌려주는 조건(ub.user_id = auth.uid())은 그대로다.
create or replace function public.get_monthly_excerpt_candidates(
  p_month text,
  p_user_book_id uuid default null,
  p_page int default 0,
  p_limit int default 30
)
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_month date;
  v_limit int := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_page int := greatest(coalesce(p_page, 0), 0);
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  v_month := public.monthly_excerpt_month_start(p_month);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'entryId', c.id,
      'date', c.date,
      'quote', c.quote,
      'note', case when c.note ~ '[^[:space:]]' then c.note end,
      'hasNote', coalesce(c.note ~ '[^[:space:]]', false),
      'isPrivate', c.is_private,
      'fromPage', c.from_page,
      'toPage', c.to_page,
      'userBookId', c.user_book_id,
      'bookId', c.book_id,
      'bookTitle', c.title,
      'author', c.author
    ) order by c.date, c.created_at, c.id)
    from (
      select e.id, e.date, e.quote, e.note, e.is_private, e.from_page, e.to_page, e.created_at,
             e.user_book_id, b.id as book_id, b.title, b.author
      from public.entries e
      join public.user_books ub on ub.id = e.user_book_id
      join public.books b on b.id = ub.book_id
      where ub.user_id = (select auth.uid())
        and e.date >= v_month and e.date < (v_month + interval '1 month')::date
        and e.quote ~ '[^[:space:]]'
        and (p_user_book_id is null or e.user_book_id = p_user_book_id)
      order by e.date, e.created_at, e.id
      limit v_limit offset v_page * v_limit
    ) c
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_monthly_excerpt_candidates(text, uuid, int, int) from public, anon;
grant execute on function public.get_monthly_excerpt_candidates(text, uuid, int, int) to authenticated;
