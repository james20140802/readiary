-- 주의: 이 디렉터리는 이 파일 이전의 기존 스키마 이력을 포함하지 않는다(스키마는 원격 Supabase에만 존재).
-- 문장 중심 리디자인 기반 마이그레이션
-- 스펙: docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md §3

-- 1) entries: summary → note, quote 추가, 내용 필수 제약
alter table public.entries rename column summary to note;
alter table public.entries add column if not exists quote text;
alter table public.entries
  add constraint entries_content_check check (quote is not null or note is not null);

-- 2) 진행률 RPC 재정의: 페이지 없는 기록은 무시, total_pages 없으면 progress null
create or replace function public.update_user_book_progress(p_book_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_book_id uuid;
  v_total_pages int;
  v_last_page int;
begin
  select ub.id, b.total_pages
    into v_user_book_id, v_total_pages
  from public.user_books ub
  join public.books b on b.id = ub.book_id
  where ub.book_id = p_book_id and ub.user_id = p_user_id;

  if v_user_book_id is null then
    return;
  end if;

  select max(e.to_page)
    into v_last_page
  from public.entries e
  where e.user_book_id = v_user_book_id and e.to_page is not null;

  update public.user_books
  set last_read_page = v_last_page,
      progress = case
        when v_last_page is null or v_total_pages is null or v_total_pages = 0 then null
        else least(100, round(v_last_page::numeric * 100 / v_total_pages))::int
      end
  where id = v_user_book_id;
end
$$;

-- 3) notifications 테이블 + RLS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accept', 'like', 'comment')),
  entry_id uuid references public.entries(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);
create policy "notifications_insert_as_actor" on public.notifications
  for insert with check (auth.uid() = actor_id);

-- 주의: badges / user_badges 테이블은 이 마이그레이션에서 drop하지 않는다.
-- 코드 제거(Task 4) 배포가 안정화된 뒤 별도 마이그레이션으로 drop한다(스펙 §3.6).
