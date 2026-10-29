-- Supabase는 2026-10-30부터 public에 새로 만들거나 다시 만든 테이블에 Data API 권한을 자동으로 주지 않는다.
-- 지금까지 기본 권한(default privileges)에 기대던 테이블 권한을 2026-10-30 프로덕션 값과 같게 적어 둔다.
-- 프로덕션에는 이미 같은 권한이 있어 바뀌는 것이 없다. 클라이언트가 쓰지 않는 TRUNCATE·TRIGGER·REFERENCES·MAINTAIN은 적지 않는다.
-- 함수 실행 권한은 각 마이그레이션에 이미 명시돼 있다.

-- 저장소 밖에서 만든 핵심 테이블. 친구·알림의 update는 열 단위로만 연다(20260904000000).
grant select, insert, update, delete
  on public.books, public.comments, public.entries, public.likes, public.profiles, public.user_books
  to authenticated;
grant select, insert, delete on public.friends, public.notifications to authenticated;

-- 서버(service_role)는 지금처럼 모든 테이블을 다룬다. 기본 권한으로만 받던 테이블을 적는다.
grant all
  on public.books, public.comments, public.entries, public.friends, public.likes, public.notifications,
    public.profiles, public.user_books, public.book_registration_requests, public.entry_reflections,
    public.feature_rollouts
  to service_role;

-- anon은 테이블에 직접 닿지 않는다(20260904000000). 옛 기본 권한으로 다시 만든 환경에서도 같게 둔다.
revoke all
  on public.books, public.comments, public.entries, public.friends, public.likes, public.notifications,
    public.profiles, public.user_books, public.book_registration_requests, public.entry_reflections,
    public.feature_rollouts
  from anon;
