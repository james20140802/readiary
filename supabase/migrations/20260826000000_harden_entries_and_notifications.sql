-- 주의: 이 디렉터리는 기존 스키마 이력을 포함하지 않으며, 마이그레이션은 원격 Supabase에 수동 적용한다.

-- 1) notifications: 클라이언트 직접 INSERT 차단 (스푸핑/스팸 방지)
--    actor_id만 검증하는 기존 정책은 임의 user_id에게 가짜 알림 삽입을 허용했다.
--    알림 삽입 경로는 Plan ⑥에서 서버 측(service role 또는 security definer 함수)으로 구현한다.
drop policy "notifications_insert_as_actor" on public.notifications;

-- 2) entries: 페이지 역전 방지 — 부분 업데이트(PATCH)를 포함한 모든 쓰기 경로를 DB에서 방어
alter table public.entries
  add constraint entries_page_order_check
  check (from_page is null or to_page is null or from_page <= to_page);
