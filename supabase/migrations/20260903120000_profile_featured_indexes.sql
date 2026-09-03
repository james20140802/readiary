-- profiles.featured_entry_id / bookmark_user_book_id 의 참조 측 인덱스.
-- on delete set null 은 기록·책이 지워질 때 참조하는 프로필 행을 찾아야 하는데, PostgreSQL 은
-- FK 의 참조 측을 자동으로 인덱싱하지 않는다. null 이 대부분이므로 부분 인덱스로.
create index if not exists profiles_featured_entry_id_idx
  on public.profiles (featured_entry_id)
  where featured_entry_id is not null;

create index if not exists profiles_bookmark_user_book_id_idx
  on public.profiles (bookmark_user_book_id)
  where bookmark_user_book_id is not null;
