-- RLS 정책을 레포로 회수한다.
-- 그동안 notifications 외의 정책은 대시보드에서 손으로 만든 것이라 코드만 봐서는 보호 범위를 알 수 없었다.
-- 이 파일이 public 스키마 8개 테이블 정책의 단일 진실이다. 기존 정책은 이름과 무관하게 전부 지우고 다시 만든다.
--
-- 고친 것(2026-09-04 pg_policies 실물 기준):
--   - profiles·user_books·likes·comments·badges SELECT가 `true`(role public)라 세션 없이 anon 키만으로 전부 읽혔다 → 모두 authenticated 전용
--   - books UPDATE가 조건 없이 허용돼 다른 사용자의 책 제목·저자·표지를 덮어쓸 수 있었다 → UPDATE 정책 제거(등록 API는 기존 ISBN 행을 그대로 쓴다)
--   - friends UPDATE에 컬럼 제한이 없어 수락자가 user_id·friend_id도 바꿀 수 있었다 → status·accepted_at만 grant
--   - entries·books INSERT 정책 중복, entries SELECT 2개 → 명령당 하나로
--   - comments·likes는 "그 엔트리를 볼 수 있는 사람"만 읽고 쓴다(entries RLS에 연동)
--   - profiles의 featured_entry_id·bookmark_user_book_id는 본인 것만 가리킬 수 있다
--   - update_user_book_progress(security definer)가 anon도 실행 가능하고 호출자 검사가 없었다 → 본인만, authenticated만
--   - anon 역할의 테이블 권한 전부 회수(공개 공유 페이지는 security definer 함수 get_public_entry만 쓴다)
--
-- 읽기 범위 결정(2026-09-04): 프로필 기본 정보는 로그인한 누구나(검색·친구 요청·댓글 작성자 표시).
--   책장·기록과 그 기록의 댓글·좋아요는 본인 + 수락된 친구만. 앱이 이미 그렇게 동작하므로 화면은 바뀌지 않고,
--   엔트리 ID만으로 API를 두드려 댓글·좋아요를 읽던 구멍이 닫힌다. 공개 공유 링크는 get_public_entry가 따로 처리한다.
-- 정책 이름 규칙: <table>_<cmd>_<scope>. auth.uid()는 (select auth.uid())로 감싸 행마다 재평가되지 않게 한다.
-- 배포 순서: 코드(책 등록 API가 books를 UPDATE하지 않는 버전)를 먼저 배포한 뒤 이 마이그레이션을 적용한다.
-- badges·user_badges는 이번에 손대지 않는다(테이블 drop은 별도 이슈).

-- 0) 대상 테이블의 기존 정책을 이름과 무관하게 전부 제거
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('books', 'user_books', 'entries', 'comments', 'likes', 'friends', 'profiles', 'notifications')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end
$$;

alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.entries enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.friends enable row level security;
alter table public.profiles enable row level security;
alter table public.notifications enable row level security;

-- 1) books — ISBN으로 공유되는 공용 테이블. 로그인한 사용자는 읽고 등록만 한다. 수정·삭제 경로 없음.
create policy "books_select_authenticated" on public.books
  for select to authenticated
  using (true);

create policy "books_insert_authenticated" on public.books
  for insert to authenticated
  with check (true);

-- 친구 판정 헬퍼 — 호출자와 p_user_id 사이에 수락된 friends 행이 있으면 true.
-- security invoker라 friends RLS(당사자만)가 그대로 적용된다. 호출자는 항상 그 행의 당사자이므로 보인다.
create or replace function public.is_friend_with(p_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.friends f
    where f.status = 'accepted'
      and (
        (f.user_id = (select auth.uid()) and f.friend_id = p_user_id)
        or (f.friend_id = (select auth.uid()) and f.user_id = p_user_id)
      )
  );
$$;

revoke all on function public.is_friend_with(uuid) from public;
revoke all on function public.is_friend_with(uuid) from anon;
grant execute on function public.is_friend_with(uuid) to authenticated;

-- 2) user_books — 책장. 읽기는 본인 + 수락된 친구, 쓰기는 본인만.
create policy "user_books_select_own_or_friend" on public.user_books
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_friend_with(user_id)
  );

create policy "user_books_insert_own" on public.user_books
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_books_update_own" on public.user_books
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_books_delete_own" on public.user_books
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 3) entries — 소유는 user_books를 거친다. 본인 기록은 전부, 친구의 기록은 공개(is_private = false)만.
--    user_books 서브쿼리에도 위 RLS가 걸리므로 친구가 아닌 사람의 행은 애초에 보이지 않는다.
create policy "entries_select_own_or_friend_public" on public.entries
  for select to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = entries.user_book_id
        and (
          ub.user_id = (select auth.uid())
          or (entries.is_private = false and public.is_friend_with(ub.user_id))
        )
    )
  );

create policy "entries_insert_own" on public.entries
  for insert to authenticated
  with check (
    exists (
      select 1 from public.user_books ub
      where ub.id = entries.user_book_id and ub.user_id = (select auth.uid())
    )
  );

create policy "entries_update_own" on public.entries
  for update to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = entries.user_book_id and ub.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.user_books ub
      where ub.id = entries.user_book_id and ub.user_id = (select auth.uid())
    )
  );

create policy "entries_delete_own" on public.entries
  for delete to authenticated
  using (
    exists (
      select 1 from public.user_books ub
      where ub.id = entries.user_book_id and ub.user_id = (select auth.uid())
    )
  );

-- 4) comments — 그 엔트리를 볼 수 있어야(entries RLS 통과) 읽고 쓴다. 수정 경로 없음. 삭제는 본인 댓글만.
create policy "comments_select_visible_entry" on public.comments
  for select to authenticated
  using (exists (select 1 from public.entries e where e.id = comments.entry_id));

create policy "comments_insert_own_on_visible_entry" on public.comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.entries e where e.id = comments.entry_id)
  );

create policy "comments_delete_own" on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 5) likes — comments와 같은 규칙.
create policy "likes_select_visible_entry" on public.likes
  for select to authenticated
  using (exists (select 1 from public.entries e where e.id = likes.entry_id));

create policy "likes_insert_own_on_visible_entry" on public.likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.entries e where e.id = likes.entry_id)
  );

create policy "likes_delete_own" on public.likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 6) friends — 양쪽 당사자만 본다. 요청은 본인이 user_id로 pending만, 수락은 받은 쪽(friend_id)이 pending → accepted만.
--    수락자가 user_id·friend_id를 고쳐 쓰지 못하도록 UPDATE는 컬럼 단위로 status·accepted_at만 허용한다.
create policy "friends_select_participant" on public.friends
  for select to authenticated
  using ((select auth.uid()) in (user_id, friend_id));

create policy "friends_insert_as_requester" on public.friends
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and friend_id <> (select auth.uid())
    and status = 'pending'
  );

create policy "friends_update_as_recipient" on public.friends
  for update to authenticated
  using (friend_id = (select auth.uid()) and status = 'pending')
  with check (friend_id = (select auth.uid()) and status = 'accepted');

create policy "friends_delete_participant" on public.friends
  for delete to authenticated
  using ((select auth.uid()) in (user_id, friend_id));

revoke update on table public.friends from authenticated, anon;
grant update (status, accepted_at) on table public.friends to authenticated;

-- 7) profiles — 로그인한 누구나 읽는다(닉네임 검색·좋아요·댓글 작성자 표시). 쓰기는 본인 행만.
--    대표 인용·책갈피는 본인 엔트리·본인 책만 가리킬 수 있다. 삭제 경로는 앱에 없으므로 정책을 두지 않는다.
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);

-- INSERT 때는 대표 인용·책갈피를 비워 둔다(온보딩은 이 둘을 넣지 않는다). UPDATE 정책의 소유 검사가 INSERT 행엔 돌지 않기 때문.
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and featured_entry_id is null
    and bookmark_user_book_id is null
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (
      featured_entry_id is null
      or exists (
        select 1
        from public.entries e
        join public.user_books ub on ub.id = e.user_book_id
        where e.id = profiles.featured_entry_id and ub.user_id = (select auth.uid())
      )
    )
    and (
      bookmark_user_book_id is null
      or exists (
        select 1 from public.user_books ub
        where ub.id = profiles.bookmark_user_book_id and ub.user_id = (select auth.uid())
      )
    )
  );

-- 8) notifications — 20260825·20260826과 같은 규칙을 같은 이름으로 다시 만든다(INSERT 없음, UPDATE는 read_at만).
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke update on table public.notifications from authenticated, anon;
grant update (read_at) on table public.notifications to authenticated;

-- 9) update_user_book_progress — 호출자 본인 책만 재계산한다. anon 실행 권한 회수.
create or replace function public.update_user_book_progress(p_book_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_book_id uuid;
  v_total_pages int;
  v_last_page int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'update_user_book_progress: not allowed' using errcode = '42501';
  end if;

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

revoke all on function public.update_user_book_progress(uuid, uuid) from public;
revoke all on function public.update_user_book_progress(uuid, uuid) from anon;
grant execute on function public.update_user_book_progress(uuid, uuid) to authenticated;

-- 10) anon은 테이블을 직접 읽거나 쓰지 않는다. 비로그인 경로는 get_public_entry(security definer)뿐이다.
revoke all on all tables in schema public from anon;
