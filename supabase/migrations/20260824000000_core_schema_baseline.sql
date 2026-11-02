-- 기준(baseline) 마이그레이션: 저장소 밖(대시보드)에서 만들어 이 디렉터리에 이력이 없던 핵심 테이블 7개를
-- 2026-08-25 이전(=첫 저장소 마이그레이션 20260825000000 적용 직전) 프로덕션 상태로 다시 만든다.
-- 목적은 "빈 DB + 저장소 마이그레이션 전체"로 지금의 프로덕션 public 스키마를 재현하는 것뿐이다.
-- 프로덕션에는 이미 이 객체들이 있으므로 이 파일을 프로덕션에 적용하지 않는다(docs/operations/supabase-api-grants.md
-- "프로덕션 이력 정리" 절 참고 — 실행 없이 이력 테이블에만 기록하는 절차를 남겨 둔다).
--
-- 근거: 2026-10-30 pg_catalog/information_schema 읽기 전용 조회(project piqlggyuhhicnjywombg).
-- 뒤에 오는 저장소 마이그레이션이 추가·변경하는 컬럼·제약·인덱스·정책은 여기서 만들지 않는다. 예:
--   - entries.note(구 summary)·quote·entries_content_check·entries_page_order_check·shared_at → 20260825/20260826/20260906063529
--   - user_books.finished_at → 20260831000000
--   - profiles.featured_entry_id·bookmark_user_book_id·관련 인덱스·profiles_avatar_owned_path → 20260903000000·20260903120000·20260906063232
--   - notifications 테이블 전체 → 20260825000000(이 파일에서 만들지 않음)
--   - 8개 테이블의 RLS 정책 전부 → 20260904000000_reclaim_rls_policies.sql이 이름과 무관하게 지우고 다시 만드는
--     단일 진실이므로 여기서는 정책을 두지 않는다(두어도 그 마이그레이션이 지운다).
--
-- 권한은 docs/operations/supabase-api-grants.md의 "새 테이블 규칙"을 따른다: anon은 받지 않고,
-- authenticated·service_role 권한은 2026-10-30 프로덕션 조회값과 같다(친구·알림류 없음 — 이 7개 중 friends만
-- 해당하며 테이블 단위 UPDATE는 주지 않는다. 컬럼 단위 UPDATE는 20260904000000이 연다).

-- 1) books — ISBN으로 공유되는 공용 테이블.
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn text unique,
  total_pages integer,
  cover_url text
);

-- 2) profiles — auth.users 1:1. featured_entry_id·bookmark_user_book_id는 20260903000000이 추가한다.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  nickname text not null,
  tag text not null,
  bio text,
  profile_image text,
  created_at timestamptz default timezone('utc'::text, now()),
  constraint profiles_nickname_tag_key unique (nickname, tag)
);

-- 3) user_books — 책장. finished_at은 20260831000000이 추가한다.
create table if not exists public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on update cascade on delete cascade,
  is_finished boolean default false,
  last_read_page integer default 0,
  started_at date,
  created_at timestamptz default timezone('utc'::text, now()),
  progress integer default 0
);

-- 4) entries — summary는 20260825000000이 note로 바꾸고 quote를 더한다.
--    content_check·page_order_check·shared_at도 뒤의 마이그레이션이 더한다.
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_book_id uuid not null constraint fk_user_book_id references public.user_books (id) on delete cascade,
  date date not null,
  from_page integer,
  to_page integer,
  summary text,
  created_at timestamptz default timezone('utc'::text, now()),
  is_private boolean not null default false
);

-- 5) friends — 양방향 친구 관계 1행.
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  requested_at timestamptz default now(),
  accepted_at timestamptz
);
create unique index if not exists unique_friendship on public.friends (user_id, friend_id);

-- 6) comments — 기록에 달린 댓글. 수정 경로 없음(지금도 없다).
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  parent_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_comments_entry_id on public.comments (entry_id);
create index if not exists idx_comments_parent_id on public.comments (parent_id);

-- 7) likes — 기록당 사용자 1회.
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint fk_likes_user_id references public.profiles (id) on delete cascade,
  entry_id uuid not null constraint fk_likes_entry_id references public.entries (id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()),
  constraint likes_user_entry_unique unique (user_id, entry_id)
);
create index if not exists idx_likes_entry_id on public.likes (entry_id);

-- RLS 활성화 — 20260904000000이 다시 켜도 안전(이미 켜져 있으면 아무 일도 하지 않는다).
alter table public.books enable row level security;
alter table public.profiles enable row level security;
alter table public.user_books enable row level security;
alter table public.entries enable row level security;
alter table public.friends enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;

-- Data API 권한 — 2026-10-30 이후 기본 권한 자동 부여가 없으므로 명시한다(anon은 받지 않는다).
-- 20261030090000_explicit_table_api_grants.sql이 같은 값을 다시 적어도 충돌 없다(grant/revoke는 멱등).
revoke all on public.books, public.profiles, public.user_books, public.entries, public.friends, public.comments, public.likes
  from public, anon, authenticated;

grant select, insert, update, delete
  on public.books, public.profiles, public.user_books, public.entries, public.comments, public.likes
  to authenticated;
-- friends는 테이블 단위 UPDATE를 주지 않는다 — 20260904000000이 status·accepted_at 컬럼 단위로만 연다.
grant select, insert, delete on public.friends to authenticated;

grant all
  on public.books, public.profiles, public.user_books, public.entries, public.friends, public.comments, public.likes
  to service_role;
