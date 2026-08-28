-- Plan ⑤ 소셜·공유: 공개 기록 1건의 문장 카드 필드를 비로그인(anon)에게 노출하는
-- 유일한 통로. RLS 정책은 변경하지 않는다 — 이 함수가 공개 범위의 전부다.
create or replace function public.get_public_entry(p_entry_id uuid)
returns table (
  id uuid,
  quote text,
  note text,
  date date,
  book_title text,
  book_author text,
  nickname text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id,
    e.quote,
    e.note,
    e.date,
    b.title as book_title,
    b.author as book_author,
    p.nickname
  from entries e
  join user_books ub on ub.id = e.user_book_id
  join books b on b.id = ub.book_id
  join profiles p on p.id = ub.user_id
  where e.id = p_entry_id
    and e.is_private = false;
$$;

revoke all on function public.get_public_entry(uuid) from public;
grant execute on function public.get_public_entry(uuid) to anon, authenticated;
