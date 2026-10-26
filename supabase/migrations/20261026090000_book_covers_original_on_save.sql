-- 책을 저장할 때마다 카카오 검색 썸네일(120×174) 주소를 다음 책 이미지 원본(가로 약 450px)으로 바꾼다.
-- 20261025090000_book_covers_original.sql은 이미 있던 표지만 바꿨다. 그 뒤 썸네일을 그대로 저장하는 옛 앱으로 등록한 책이
-- 다시 흐리게 보였으므로, 앱 버전과 상관없이 DB가 같은 규칙(lib/books/coverUrl.ts)으로 저장값을 맞춘다.
-- 되돌리기: drop trigger books_cover_url_original on public.books; drop function public.books_original_cover_url();
create or replace function public.books_original_cover_url()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cover_url ~ '^https://search1\.kakaocdn\.net/thumb/[^/?]+/?\?fname=https?%3A%2F%2Ft1\.daumcdn\.net%2Flbook%2Fimage%2F[0-9]+(%3Ftimestamp%3D[0-9]+)?$' then
    new.cover_url := 'https://t1.daumcdn.net/lbook/image/'
      || (regexp_match(new.cover_url, 'lbook%2Fimage%2F([0-9]+)'))[1]
      || coalesce('?timestamp=' || (regexp_match(new.cover_url, '%3Ftimestamp%3D([0-9]+)$'))[1], '');
  end if;
  return new;
end;
$$;

revoke all on function public.books_original_cover_url() from public, anon, authenticated;

drop trigger if exists books_cover_url_original on public.books;
create trigger books_cover_url_original
  before insert or update of cover_url on public.books
  for each row execute function public.books_original_cover_url();

-- 이전 백필 뒤에 썸네일로 저장된 표지를 같은 규칙으로 바꾼다(트리거가 값을 고친다).
update public.books
set cover_url = cover_url
where cover_url ~ '^https://search1\.kakaocdn\.net/thumb/[^/?]+/?\?fname=https?%3A%2F%2Ft1\.daumcdn\.net%2Flbook%2Fimage%2F[0-9]+(%3Ftimestamp%3D[0-9]+)?$';
