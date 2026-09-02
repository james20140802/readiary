-- profiles.featured_entry_id: 프로필 책 뒷표지에 싣는 대표 인용(entries.id). 본인이 고른다.
-- 기록이 지워지면 뒷표지는 비운다(on delete set null). 뒷표지에 보이는지는 entries RLS가 정한다
-- (비공개 기록을 골라 두면 친구에게는 빈 뒷표지).
alter table public.profiles
  add column if not exists featured_entry_id uuid references public.entries(id) on delete set null;
