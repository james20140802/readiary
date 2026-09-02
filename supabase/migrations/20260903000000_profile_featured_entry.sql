-- 프로필 책에 본인이 골라 두는 것 둘.
-- featured_entry_id: 뒷표지에 싣는 대표 인용(entries.id).
-- bookmark_user_book_id: 책 윗면에 끼워 두는 책갈피 — 완독한 책(user_books.id). 누르면 그 책의 발췌집 페이지로 펼쳐진다.
-- 기록·책이 지워지면 자리를 비운다(on delete set null). 친구에게 보이는지는 entries/user_books RLS가 정한다.
alter table public.profiles
  add column if not exists featured_entry_id uuid references public.entries(id) on delete set null,
  add column if not exists bookmark_user_book_id uuid references public.user_books(id) on delete set null;
