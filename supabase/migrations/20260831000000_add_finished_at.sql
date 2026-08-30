-- user_books.finished_at: 완독 선언 시각. 완독 취소 시 null로 되돌린다.
-- 기존 완독 도서는 정확한 완독 시각을 알 수 없어 백필하지 않는다(null 유지, UI는 기존 대체 표기 유지).
alter table public.user_books
  add column if not exists finished_at timestamptz;
