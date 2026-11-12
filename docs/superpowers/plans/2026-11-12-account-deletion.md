# 계정 탈퇴와 14일 복구 유예 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 독자가 설정에서 탈퇴를 신청하면 바로 다른 사람에게서 숨겨지고, 14일 안에 로그인하면 되돌릴 수 있으며, 14일 뒤에는 정기 작업이 파일까지 모두 지운다.

**Architecture:** 탈퇴 상태는 일반 사용자가 쓸 수 없는 `account_deletions` 테이블에 둔다. 숨김과 쓰기 차단은 `is_account_active(uuid)` 헬퍼를 RLS(restrictive 정책)와 security definer RPC에 넣어 DB에서 보장한다. 신청은 서버 라우트가 본인 확인 후 서비스 롤로 기록하고, 복구는 본인 RPC로 한다. 완전 삭제는 pg_cron이 `CRON_SECRET`으로 보호된 Next 라우트를 하루 한 번 호출해서 처리한다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase(Postgres RLS, Auth, Storage), Vitest, PGlite 계약 테스트

**Spec:** `docs/superpowers/specs/2026-11-12-account-deletion-design.md`

## Global Constraints

- 유예 기간은 **14일**이다. 최종 리뷰에서 `purge_after`를 신청한 날(KST) + 15일의 0시 KST로 고쳤다(`(date_trunc('day', now() at time zone 'Asia/Seoul') + interval '15 days') at time zone 'Asia/Seoul'`). 화면의 "~까지"는 `purge_after − 1초`의 KST 날짜(= 신청일 + 14일)다(`formatRestoreDeadline`).
- 삭제 완료 기록(`account_deletion_purges`)은 사용자 UUID와 삭제 시각만 담고, **30일** 뒤에 지운다. 이메일, 닉네임, 내용은 넣지 않는다.
- OAuth 사용자(비밀번호 없음)의 본인 확인 기준은 마지막 인증 시각이 **10분(600초) 이내**인지다.
- 약관과 방침 개정은 **30일 전에 공지**한다. 탈퇴 버튼과 API는 `ACCOUNT_DELETION_EFFECTIVE_AT` 전에는 닫혀 있다.
- 숨김과 차단은 UI가 아니라 RLS와 RPC에서 보장한다. 새 DB 동작은 `supabase/tests/run-*-contract.mjs`로 검증하고, `npm run test:db`(CI 필수 검사 Verify DB contracts)에 자동 포함된다.
- 서비스 롤 키와 `CRON_SECRET`은 서버 코드에서만 읽는다. 사용자 ID, 이메일, 토큰을 로그에 남기지 않는다.
- 문구는 행동과 결과를 말한다. 디자인 규범은 `AGENTS.md`의 "Design Context"와 `docs/ui-guidelines.md`를 따른다. 위험 행동 글자색은 `text-danger`이고, 파란 강조색이나 먹 배경의 주요 버튼으로 만들지 않는다.
- 브라우저 API 호출은 `lib/api/fetch.ts`의 `apiFetch`를 쓴다. 변경 요청 라우트는 같은 출처를 확인한다(`lib/email/server.ts`의 `emailSameOrigin` 방식).
- 날짜 표시는 KST 기준이다.

## Review Focus

1. **신청 직후에도 남아 있는 옛 액세스 토큰**: global sign-out을 해도 이미 발급된 토큰은 최대 1시간 유효하다. 그 토큰으로 기록, 댓글, 좋아요, 친구 요청, 발췌집 저장을 시도하면 모두 거부돼야 한다. 테스트는 Task 3에 있다.
2. **유예 중인 사람이 남긴 반응**: 친구 기록에 달아 둔 댓글과 좋아요, 친구 발췌집의 반응이 그 기록 주인에게도 보이지 않아야 한다. 테스트는 Task 2에 있다.
3. **외부 공유 링크**: 공유해 둔 기록 링크(`get_public_entry`)를 비로그인 상태로 열면 유예 중에는 빈 결과가 나와야 한다. 테스트는 Task 2에 있다.
4. **파일 삭제 부분 실패**: Storage 파일 100개 중 일부 삭제가 실패하면 Auth 사용자를 지우지 않고, 다음 실행에서 다시 시도해야 한다. 테스트는 Task 7에 있다.
5. **복구 직후 프록시 캐시**: 복구하자마자 홈으로 가도 복구 화면으로 되돌아가지 않아야 한다. 신청 직후에는 다른 기기에서 앱 화면이 열리지 않아야 한다. 테스트는 Task 5에 있다.

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `supabase/migrations/20261112090000_account_deletions.sql` | 상태 테이블, 삭제 완료 기록, 헬퍼, 신청·복구·삭제 RPC |
| `supabase/migrations/20261112091000_account_deletion_visibility.sql` | 숨김: `is_friend_with`, restrictive SELECT 정책, definer 읽기 RPC |
| `supabase/migrations/20261112092000_account_deletion_writes.sql` | 쓰기 차단: restrictive 쓰기 정책, definer 쓰기 RPC, 발송 후보 제외 |
| `supabase/tests/run-account-deletion-contract.mjs` | 위 세 마이그레이션의 계약 테스트(Task 1~3이 차례로 채운다) |
| `lib/account/deletion.ts` | 상수, 날짜 계산, 공개 시점, 최근 인증 판정(순수 함수) |
| `lib/account/admin.ts` | 서버 전용 서비스 롤 클라이언트 |
| `app/api/account/deletion/route.ts` | `POST` 신청, `DELETE` 복구 |
| `lib/auth/profilePresence.ts` → `profileState` | 프록시 라우팅 힌트: missing, active, pending |
| `proxy.ts` | 유예 중이면 복구 화면으로 보냄 |
| `app/account/restore/page.tsx`, `components/account/RestoreAccount.tsx` | 복구 화면 |
| `components/settings/AccountDeletionSheet.tsx` | 설정의 탈퇴 시트 |
| `app/api/cron/account-deletion/route.ts` | 완전 삭제와 기록 정리 |
| `supabase/operations/enable-account-deletion-cron.sql` | pg_cron 일일 호출 설치 |
| `lib/legal/texts.ts`, `lib/legal/archive.ts` | 약관·방침 개정, 시행일 상수 |
| `docs/operations/privacy-release.md`, `docs/operations/account-deletion.md` | 운영 절차(앱 신청, 메일 신청, 백업 재반영) |

---

### Task 1: 탈퇴 상태 테이블과 신청·복구·삭제 RPC

**Files:**
- Create: `supabase/migrations/20261112090000_account_deletions.sql`
- Create: `supabase/tests/run-account-deletion-contract.mjs`
- Modify (필요한 경우): `supabase/tests/run-migration-chain-contract.mjs`, `supabase/tests/fixtures/prod-public-schema.json`. 2026-10-30 이후 추가된 마이그레이션(예: `20261106*_monthly_excerpts*.sql`)을 이 테스트가 어떻게 받아들였는지 `git log -p`로 확인하고 같은 방식을 따른다.

**Interfaces:**
- Produces (SQL):
  - `public.account_deletions(user_id uuid primary key references auth.users(id) on delete cascade, requested_at timestamptz not null default now(), purge_after timestamptz not null)`. RLS를 켠다. `authenticated`에는 본인 행 SELECT만 허용하고 INSERT, UPDATE, DELETE 권한은 주지 않는다. `profiles(id)`로의 FK도 둔다. 프록시가 `profiles` 조회에 `account_deletions(purge_after)`를 임베드하기 위해서다.
  - `public.account_deletion_purges(user_id uuid primary key, purged_at timestamptz not null default now())`. FK는 두지 않는다(사용자가 이미 지워졌다). `authenticated`와 `anon`에게는 권한이 없다.
  - `public.is_account_active(p_user uuid) returns boolean`. `stable security definer`, `search_path = public, pg_temp`로 만든다. `account_deletions`에 행이 없으면 true를 반환한다. `authenticated`, `anon`, `service_role`에 실행 권한을 준다.
  - `public.assert_account_active() returns void`. `auth.uid()`가 유예 중이면 `raise exception 'account_pending_deletion' using errcode = '42501'`. `authenticated`, `service_role`에 실행 권한을 준다.
  - `public.request_account_deletion(p_user uuid) returns timestamptz`. 서비스 롤 전용 definer 함수다. 행이 이미 있으면 기존 `purge_after`를 그대로 반환한다(멱등). 신청과 함께 `push_subscriptions`에서 그 사용자 행을 지운다.
  - `public.cancel_account_deletion() returns boolean`. `authenticated` 전용 definer 함수로, `auth.uid()`의 행만 지운다. 지운 행이 있으면 true를 반환한다.
  - `public.claim_due_account_deletions(p_limit int) returns setof uuid`. 서비스 롤 전용이다. `purge_after <= now()`인 행을 `for update skip locked`로 잡아 반환한다.
  - `public.record_account_purge(p_user uuid) returns void`. 서비스 롤 전용으로, `account_deletion_purges`에 upsert한다.
  - `public.prune_account_purges() returns integer`. 서비스 롤 전용으로, `purged_at < now() - interval '30 days'`인 행을 지우고 그 수를 반환한다.

- [ ] **Step 1: 실패하는 계약 테스트 작성** (`run-account-deletion-contract.mjs`). `supabase/tests/lib/rls-fixture.mjs`의 `runRlsContract`와 `OWNER/FRIEND/PENDING/STRANGER` 시드를 쓴다. 서비스 롤 호출은 관리자 `db`에서 `set role service_role`로 실행한다(`run-push-contract.mjs` 참고).
  - `request_account_deletion(OWNER)`는 `requested_at + 14일`을 반환한다. 두 번 불러도 같은 값을 반환한다.
  - `authenticated`(OWNER)로 `request_account_deletion`을 직접 부르면 `42501`로 거부된다.
  - OWNER는 자기 `account_deletions` 행을 읽을 수 있다. FRIEND는 0행을 본다. 행의 insert, update, delete는 OWNER도 거부된다.
  - `is_account_active(OWNER)`는 신청 후 false, `cancel_account_deletion()`(OWNER로 실행) 후 true다. FRIEND가 취소를 실행하면 false를 반환하고 OWNER 행은 남아 있다.
  - 신청하면 OWNER의 `push_subscriptions` 행이 지워진다.
  - `claim_due_account_deletions(10)`은 `purge_after`를 과거로 고친 행만 반환한다.
  - `record_account_purge` 후 31일 전으로 고친 기록은 `prune_account_purges()`가 지우고 1을 반환한다. 29일 전 기록은 남는다.
  - `account_deletion_purges`는 `authenticated`와 `anon`에서 SELECT가 `42501`로 거부된다.
- [ ] **Step 2: 실행해서 실패 확인.** `node supabase/tests/run-account-deletion-contract.mjs`. 예상 결과는 함수 없음 오류로 인한 FAIL이다.
- [ ] **Step 3: 마이그레이션 작성.** 권한은 `20261030090000_explicit_table_api_grants.sql`처럼 명시적으로 준다. 모든 함수에서 `revoke all ... from public`을 먼저 한다.
- [ ] **Step 4: 통과 확인.** `node supabase/tests/run-account-deletion-contract.mjs`가 PASS여야 한다. `npm run test:db` 전체도 통과해야 한다.
- [ ] **Step 5: 커밋.** `feat: 탈퇴 신청 상태와 복구·삭제 RPC를 둔다`

### Task 2: 유예 중인 계정을 다른 사람에게서 숨기기

**Files:**
- Create: `supabase/migrations/20261112091000_account_deletion_visibility.sql`
- Modify: `supabase/tests/run-account-deletion-contract.mjs`

**Interfaces:**
- Consumes: `is_account_active(uuid)` (Task 1)
- Produces:
  - `is_friend_with(p_user_id)`가 `is_account_active(p_user_id)`도 요구하도록 재정의한다. 이 함수에 기대는 `entries`와 `user_books` 정책, invoker RPC(`get_social_feed`, `get_social_feed_items`, `get_profile_retrospect`, `get_reading_stats`, `get_featured_bookmark`)가 자동으로 따라온다.
  - restrictive SELECT 정책(`as restrictive for select to authenticated`)을 추가한다. 이름은 `<table>_hide_pending_deletion`으로 한다.
    - `profiles`: `id = auth.uid() or is_account_active(id)`
    - `comments`, `likes`, `monthly_excerpt_comments`, `monthly_excerpt_likes`: `user_id = auth.uid() or is_account_active(user_id)`
    - `friends`: 상대방이 활성인 경우만 보인다. `(user_id = auth.uid() and is_account_active(friend_id)) or (friend_id = auth.uid() and is_account_active(user_id))`
    - `notifications`: `is_account_active(actor_id)`
  - definer 읽기 함수에 소유자 활성 조건을 넣는다: `can_view_monthly_excerpt`, `friend_feed_monthly_excerpts`, `get_friend_monthly_excerpt`, `get_friend_monthly_excerpt_year`, `get_friend_monthly_excerpt_years`, `get_monthly_excerpt_reactions`(반응한 사람도 활성이어야 함), `get_public_entry`. 각 함수의 최신 정의는 마이그레이션 중 가장 늦은 파일에서 가져와 그대로 다시 정의하고, 조건만 더한다.

- [ ] **Step 1: 실패하는 테스트 추가.** OWNER와 FRIEND가 친구이고, FRIEND의 공개 기록에 OWNER가 댓글과 좋아요를 달았으며, OWNER의 공유 기록(`shared_at` 설정)과 친구 공개 월간 발췌집이 있는 상태를 시드한다. `request_account_deletion(OWNER)` 후 다음을 단언한다.
  - FRIEND 기준으로 `profiles`에서 OWNER 0행, `user_books`와 `entries`에서 OWNER 것 0행, FRIEND 기록의 `comments`와 `likes`에서 OWNER 것 0행, `friends`에서 OWNER와의 관계 0행, OWNER가 actor인 `notifications` 0행
  - `get_social_feed_items(1, 20)`에 OWNER 항목이 없다. `friend_feed_monthly_excerpts(20)`, `get_friend_monthly_excerpt(OWNER, <월>)`는 빈 결과다.
  - FRIEND 발췌집에 OWNER가 남긴 반응이 `get_monthly_excerpt_reactions`에 없다.
  - anon의 `get_public_entry(<OWNER 공유 기록>)`가 0행이다.
  - OWNER 본인은 자기 `profiles` 행을 여전히 읽는다(프록시가 쓴다).
  - `cancel_account_deletion()` 후에는 위 항목이 모두 신청 전과 같은 결과로 돌아온다. 같은 단언을 "보인다"로 다시 확인한다.
- [ ] **Step 2: 실행해서 실패 확인.** `node supabase/tests/run-account-deletion-contract.mjs`
- [ ] **Step 3: 마이그레이션 작성.** 함수를 재정의할 때 기존 `grant`와 `revoke`를 그대로 다시 적용한다.
- [ ] **Step 4: 통과 확인.** 이 테스트와 `npm run test:db` 전체를 실행한다. 기존 `run-social-rls-contract`, `run-friends-profiles-rls-contract`, `run-monthly-excerpts-contract`, `run-performance-contract`도 그대로 통과해야 한다.
- [ ] **Step 5: 커밋.** `feat: 탈퇴 유예 중인 독자를 친구·공유 링크에서 숨긴다`

### Task 3: 유예 중 쓰기 차단과 발송 제외

**Files:**
- Create: `supabase/migrations/20261112092000_account_deletion_writes.sql`
- Modify: `supabase/tests/run-account-deletion-contract.mjs`

**Interfaces:**
- Consumes: `is_account_active`, `assert_account_active` (Task 1)
- Produces:
  - 다음 테이블마다 INSERT, UPDATE, DELETE restrictive 정책을 각각 하나씩 만든다(`<table>_<cmd>_requires_active`). 조건은 `is_account_active(auth.uid())`다. 대상은 `book_registration_requests`, `books`, `comments`, `entries`, `entry_reflections`, `friends`, `likes`, `monthly_excerpt_comments`, `monthly_excerpt_likes`, `monthly_excerpts`, `notifications`, `profiles`, `push_subscriptions`, `user_books`이며, 각 테이블에 이미 있는 명령에만 만든다. 목록은 `pg_policies`로 다시 확인한다.
  - 다음 definer RPC의 맨 앞에 `perform public.assert_account_active();`를 넣는다: `save_monthly_excerpt`, `set_monthly_excerpt_shared`, `update_user_book_progress`, `notify_entry_event`, `notify_friend_event`, `notify_monthly_excerpt_event`, `retract_like_notification`, `retract_monthly_excerpt_like_notification`, `save_push_preferences`, `save_push_subscription`, `mark_push_seen`.
  - `friends` INSERT에는 상대도 활성이어야 한다는 restrictive 조건을 하나 더 둔다(`is_account_active(friend_id)`). 유예 중인 독자에게 새 친구 요청을 보낼 수 없게 하기 위해서다.
  - `push_candidates`, `claim_push_batch`, `claim_marketing_email`은 유예 중인 사용자를 후보에서 뺀다.

- [ ] **Step 1: 실패하는 테스트 추가.** `request_account_deletion(OWNER)` 후 OWNER 권한으로 다음을 시도하면 모두 `42501`로 거부된다(`rls-fixture.mjs` 머리말대로 `returning`이나 `where` 없이 실행하고, 관리자 권한으로 변화가 없는지 확인한다).
  - `entries` insert와 update, FRIEND 기록에 `comments`와 `likes` insert, `friends` insert(STRANGER에게 요청), `profiles` update, `save_monthly_excerpt('<월>', '{}', false)`, `save_push_subscription('https://x', 'k', 'a')`
  - 다른 사람(FRIEND)의 쓰기는 영향 없이 계속 성공한다. 단, STRANGER가 OWNER에게 `friends` insert를 시도하면 거부된다.
  - OWNER의 `cancel_account_deletion()`은 성공한다. 그 뒤 OWNER의 `entries` insert가 다시 성공한다.
  - `push_candidates(OWNER, now())`는 유예 중에 0행을 반환한다. 푸시 시드는 `push_contract.sql`을 참고한다.
- [ ] **Step 2: 실행해서 실패 확인.**
- [ ] **Step 3: 마이그레이션 작성.**
- [ ] **Step 4: 통과 확인.** 이 테스트와 `npm run test:db` 전체를 실행한다.
- [ ] **Step 5: 커밋.** `feat: 탈퇴 유예 중에는 기록과 반응을 남기지 못하게 한다`

### Task 4: 탈퇴 도메인 상수와 판정 함수

**Files:**
- Create: `lib/account/deletion.ts`, `lib/account/admin.ts`
- Test: `lib/account/__tests__/deletion.test.ts`
- Modify: `lib/legal/texts.ts` (상수만 추가한다. 본문 개정은 Task 8에서 한다.)

**Interfaces:**
- Produces:
  - `export const ACCOUNT_DELETION_GRACE_DAYS = 14`
  - `export const OAUTH_REAUTH_WINDOW_SECONDS = 600`
  - `lib/legal/texts.ts`: `export const ACCOUNT_DELETION_EFFECTIVE_AT = '<시행일>T00:00:00+09:00'`. 값은 Task 8에서 정하는 방침 시행일과 같다.
  - `isAccountDeletionOpen(now: Date = new Date()): boolean`
  - `formatPurgeDate(purgeAfter: string | Date): string`. KST 기준 `"11월 26일"` 형식이다.
  - `hasRecentSignIn(claims: unknown, nowSeconds: number): boolean`. `amr` 항목 중 가장 늦은 `timestamp`가 `nowSeconds - 600` 이상이면 true다. `lib/auth/recoverySession.ts`의 `amr` 파싱 방식을 따른다.
  - `hasPasswordIdentity(user: { email?: string | null; identities?: { provider: string }[] | null }): boolean`. `PasswordChange.tsx` 237~238행의 판정을 옮기고, 그 파일도 이 함수를 쓰도록 바꾼다.
  - `lib/account/admin.ts`: `accountAdmin(): SupabaseClient`. 서버 전용이며, 브라우저에서 부르면 throw한다. `lib/email/server.ts`의 `emailAdmin`과 같은 형태다.

- [ ] **Step 1: 실패하는 테스트 작성.**
  - `formatPurgeDate('2026-11-26T14:59:59Z')`는 `'11월 26일'`, `formatPurgeDate('2026-11-26T15:00:00Z')`는 `'11월 27일'`을 반환한다(KST 경계).
  - `hasRecentSignIn({ amr: [{ method: 'oauth', timestamp: 1000 }] }, 1600)`은 true, 1601이면 false다. `amr`이 없거나 배열이 아니면 false다. 여러 항목이 있으면 가장 늦은 시각을 쓴다.
  - `isAccountDeletionOpen`은 시행일 직전 1ms에는 false, 시행일 시각에는 true다.
  - `hasPasswordIdentity`는 identities에 `email` provider가 있고 email이 있을 때만 true다.
- [ ] **Step 2: 실패 확인.** `npx vitest run lib/account`
- [ ] **Step 3: 구현.**
- [ ] **Step 4: 통과 확인.** `npx vitest run lib/account components/settings`
- [ ] **Step 5: 커밋.** `feat: 탈퇴 기간과 본인 확인 판정을 한곳에 둔다`

### Task 5: 신청·복구 API와 프록시 라우팅

**Files:**
- Create: `app/api/account/deletion/route.ts`, `app/api/account/deletion/__tests__/route.test.ts`
- Modify: `lib/auth/profilePresence.ts`(→ `profileState`), `lib/auth/__tests__/`의 기존 테스트, `proxy.ts`, `lib/routes.ts`(필요한 경우), proxy 테스트

**Interfaces:**
- Consumes: Task 1의 RPC, Task 4의 함수
- Produces:
  - `POST /api/account/deletion` body `{ password?: string }`
    - 403 `{ code: 'forbidden_origin' }`: 다른 출처에서 온 요청
    - 401 `unauthorized()`: 세션 없음
    - 404 `{ code: 'not_open' }`: 시행 전
    - 400 `{ code: 'password_required' }`, 403 `{ code: 'wrong_password' }`: 비밀번호 사용자가 입력을 안 했거나 틀림. 확인은 세션을 남기지 않는 별도 anon 클라이언트(`persistSession: false`)의 `signInWithPassword`로 한다.
    - 403 `{ code: 'reauth_required' }`: 비밀번호가 없는 사용자의 `hasRecentSignIn`이 false. claims는 서버 클라이언트의 `auth.getClaims()`로 얻는다.
    - 200 `{ purgeAfter: string }`: `accountAdmin().rpc('request_account_deletion', { p_user })` 뒤 사용자 서버 클라이언트로 `auth.signOut({ scope: 'global' })`를 부르고, `forgetProfileState(user.id)`를 호출한다.
  - `DELETE /api/account/deletion`: 같은 출처 확인과 인증을 거쳐 사용자 클라이언트로 `rpc('cancel_account_deletion')`를 부른다. 성공하면 200 `{ restored: boolean }`과 함께 `forgetProfileState(user.id)`를 호출한다.
  - `profileState(userId, lookup, forceRefresh): Promise<'missing' | 'active' | 'pending'>`. `lookup`은 `profiles.select('id, account_deletions(purge_after)')` 결과를 받는다. 캐시는 `'active'`일 때만 기존처럼 60초 둔다. `forgetProfileState(userId): void`를 export한다.
  - `proxy.ts`: `'pending'`이면 `/account/restore` 이외의 앱 경로와 `/onboarding`을 `/account/restore`로 보낸다. `/account/restore`는 로그인한 사용자만 볼 수 있다. 로그인하지 않았으면 `/login`으로 보낸다. matcher와 `lib/routes.ts`의 목록을 함께 갱신한다(이 둘이 일치하는지 테스트가 확인한다).

- [ ] **Step 1: 실패하는 테스트 작성.** 기존 라우트 테스트(`app/api/email-preferences`, `lib/email/__tests__/routes.test.ts`)의 Supabase 모킹 방식을 따른다.
  - 위 응답 코드 각각에 대한 테스트를 하나씩 작성한다.
  - `wrong_password`와 `reauth_required`인 경우 `request_account_deletion`이 호출되지 않는다.
  - 성공하면 `signOut`이 `{ scope: 'global' }`로 한 번 호출된다.
  - `DELETE`의 `restored: false`(유예 중이 아님)도 200이다.
  - `profileState`: 임베드 결과가 `[]`이거나 null이면 `'active'`, 행이 있으면 `'pending'`, 프로필이 없으면 `'missing'`이다. `'pending'`은 캐시하지 않아서 두 번째 호출도 lookup을 부른다. `forgetProfileState` 후에는 `'active'` 캐시도 다시 조회한다.
  - proxy: pending 사용자가 `/today`를 요청하면 `/account/restore`로, `/account/restore`를 요청하면 통과한다. active 사용자가 `/account/restore`를 요청하면 `/today`로 보낸다.
- [ ] **Step 2: 실패 확인.** `npx vitest run app/api/account lib/auth`
- [ ] **Step 3: 구현.**
- [ ] **Step 4: 통과 확인.** `npm test`
- [ ] **Step 5: 커밋.** `feat: 탈퇴 신청·복구 API와 복구 화면 라우팅`

### Task 6: 설정의 탈퇴 시트, 복구 화면, 안내 문구

**Files:**
- Create: `components/settings/AccountDeletionSheet.tsx`, `components/account/RestoreAccount.tsx`, `app/account/restore/page.tsx`
- Modify: `components/settings/Sections.tsx`(`AccountSection`에 `onDelete?: () => void`를 추가하고, 있을 때만 맨 아래 행으로 그린다), `components/settings/SettingsScreen.tsx`, `app/login/page.tsx`, `app/signup/email/page.tsx`
- Test: `components/settings/__tests__/AccountDeletionSheet.test.tsx`, `components/account/__tests__/RestoreAccount.test.tsx`

**Interfaces:**
- Consumes: Task 4 함수, Task 5 API, 기존 `Sheet`, `Button`, `Input variant="line"`, `FormAlert`, `apiFetch`, `buildOAuthRedirectTo`
- Produces:
  - `AccountDeletionSheet({ open, onClose, hasPassword, now })`
  - 설정은 `isAccountDeletionOpen()`일 때만 `onDelete`를 넘긴다. URL에 `?delete=1`이 있으면 시트를 연 채로 시작한다(OAuth 재로그인 복귀용).
  - 로그인 화면은 `?notice=deletion-requested&until=<YYYY-MM-DD>`를 받으면 `"탈퇴를 신청했어요. {formatPurgeDate(until)}까지 로그인하면 되돌릴 수 있어요."`를 보여 준다.
- 고정 문구:
  - 설정 행: `탈퇴하기`
  - 시트 제목: `탈퇴하기`
  - 시트 본문(부리 서체가 아닌 기본 서체):
    `탈퇴를 신청하면 친구와 공유 링크에서 바로 보이지 않아요.`
    `{날짜}까지 다시 로그인하면 지금 그대로 되돌릴 수 있고, 그 뒤에는 책장과 기록이 모두 지워져요.`
  - 내보내기 링크: `떠나기 전에 기록 내보내기`(`/api/export`)
  - 최종 버튼: `탈퇴 신청`
  - OAuth 재인증 버튼: `다시 로그인하고 계속`
  - 오류: wrong_password `비밀번호가 맞지 않아요.`, 그 밖의 오류 `탈퇴를 신청하지 못했어요. 잠시 후 다시 시도해 주세요.`
  - 복구 화면 제목: `탈퇴를 신청한 계정이에요`, 본문: `{날짜}에 모든 기록이 지워져요. 그 전에 돌아오면 지금 그대로 이어서 쓸 수 있어요.`, 버튼: `탈퇴 취소하고 돌아가기`(주요), `로그아웃`(보조), 복구 후 안내: `돌아오신 걸 환영해요. 기기 알림은 다시 켜야 해요.`
  - 가입 화면의 기존 이미 가입된 이메일 문구 뒤에 다음을 덧붙인다: `탈퇴를 신청한 계정이라면 14일 안에 로그인해서 되돌릴 수 있어요.`

- [ ] **Step 1: 실패하는 컴포넌트 테스트 작성** (Testing Library, 기존 `components/settings/__tests__` 방식).
  - 비밀번호 사용자: 비밀번호가 비어 있으면 `탈퇴 신청`이 비활성이다. 입력하고 누르면 `apiFetch('/api/account/deletion', { method: 'POST', body: { password } })`가 호출된다. 403 `wrong_password`면 `비밀번호가 맞지 않아요.`가 보인다.
  - 성공하면 `supabase.auth.signOut({ scope: 'local' })` 뒤 `/login?notice=deletion-requested&until=...`로 `router.replace`한다.
  - OAuth 사용자: 비밀번호 입력 없이 `탈퇴 신청`이 활성이다. 403 `reauth_required`면 `다시 로그인하고 계속`이 보이고, 누르면 `redirectTo`가 `/settings?delete=1`로 끝나는 OAuth 로그인을 시작한다.
  - 시트에 `formatPurgeDate(now + 14일)`의 날짜가 보인다.
  - 복구 화면: `탈퇴 취소하고 돌아가기`는 `DELETE`를 호출한 뒤 `/today`로 이동한다. 실패하면 오류 문구가 보이고 버튼이 다시 활성화된다.
- [ ] **Step 2: 실패 확인.** `npx vitest run components/settings components/account`
- [ ] **Step 3: 구현.** 복구 페이지는 서버 컴포넌트에서 `account_deletions`의 본인 행(`purge_after`)을 읽어 넘긴다. 행이 없으면 `/today`로 redirect한다.
- [ ] **Step 4: 통과 확인.** `npm test && npm run lint`
- [ ] **Step 5: 커밋.** `feat: 설정에서 탈퇴를 신청하고 14일 안에 되돌린다`

### Task 7: 완전 삭제 정기 작업

**Files:**
- Create: `app/api/cron/account-deletion/route.ts`, `app/api/cron/account-deletion/__tests__/route.test.ts`, `supabase/operations/enable-account-deletion-cron.sql`

**Interfaces:**
- Consumes: Task 1 RPC, `accountAdmin()`
- Produces: `GET /api/cron/account-deletion`
  - 인증은 `app/api/cron/push/route.ts`와 똑같이 `timingSafeEqual`과 `Bearer ${CRON_SECRET}`로 한다. 틀리면 401이다.
  - `claim_due_account_deletions(5)` 결과의 각 사용자에 대해 다음을 처리한다.
    1. `storage.from('profiles').list('<uid>', { limit: 100, offset })`를 끝까지 페이지 단위로 조회하고, `remove(paths)`로 지운다. 하위 폴더가 있으면 재귀한다.
    2. list나 remove 중 하나라도 오류가 나면 그 사용자는 건너뛰고 `failed`에 센다.
    3. 모두 성공하면 `auth.admin.deleteUser(uid)` 뒤 `record_account_purge(uid)`를 실행한다.
  - 마지막에 `prune_account_purges()`를 실행한다.
  - 응답은 `{ purged: number, failed: number, pruned: number }`이다. 사용자 ID는 응답과 로그에 넣지 않는다. 실패가 하나라도 있으면 500으로 응답하되 본문의 집계는 유지한다.
  - `enable-account-deletion-cron.sql`: `enable-push-cron.sql`처럼 Vault의 `readiary_account_deletion_url`과 기존 `readiary_cron_secret`으로 `net.http_get`을 KST 매일 04:17(UTC 19:17)에 예약한다. 다시 실행해도 안전하도록 기존 작업을 먼저 해제한다.

- [ ] **Step 1: 실패하는 테스트 작성.**
  - 잘못된 secret이면 401이다.
  - 파일 150개를 두 페이지로 돌려주는 모킹에서 `remove`가 모든 경로로 호출된 뒤 `deleteUser`와 `record_account_purge`가 호출된다.
  - 두 번째 `remove`가 실패하면 `deleteUser`가 호출되지 않고 `{ purged: 0, failed: 1 }`과 500을 반환한다.
  - `prune_account_purges`는 실패가 있어도 실행된다.
  - 응답 본문에 사용자 ID 문자열이 없다.
- [ ] **Step 2: 실패 확인.** `npx vitest run app/api/cron/account-deletion`
- [ ] **Step 3: 구현.**
- [ ] **Step 4: 통과 확인.** `npm test`
- [ ] **Step 5: 커밋.** `feat: 유예가 끝난 계정을 매일 완전히 지운다`

### Task 8: 약관·방침 개정과 운영 문서

**Files:**
- Modify: `lib/legal/texts.ts`, `lib/legal/archive.ts`, `lib/legal/__tests__/*`(있는 경우), `docs/operations/privacy-release.md`, `docs/operations/email-marketing-consent.md`(탈퇴 시점 표현)
- Create: `docs/operations/account-deletion.md`

**Interfaces:**
- Produces:
  - 현행 약관과 방침 전문을 `archive.ts`에 기존 형식대로 보관한다.
  - 시행일 상수: `LEGAL_ANNOUNCED`는 배포하는 날(초안 `'2026년 11월 13일'`), `TERMS_EFFECTIVE`와 `PRIVACY_EFFECTIVE`는 그로부터 30일 뒤(초안 `'2026년 12월 13일'`), `ACCOUNT_DELETION_EFFECTIVE_AT`은 `'2026-12-13T00:00:00+09:00'`이다. `LEGAL_REVISION`의 안내 종료 시각도 함께 맞춘다. **머지 직전에 실제 배포일로 다시 맞춘다.**
  - 약관 제8조 1항: `회원은 언제든 설정 화면에서 계정 삭제(탈퇴)를 신청할 수 있으며, ${CONTACT}로도 요청할 수 있습니다. 신청 후 14일 안에 다시 로그인하면 신청을 취소할 수 있고, 14일이 지나면 계정과 정보가 지워집니다.`
  - 방침 제3조 1항: "탈퇴하면 … 지체 없이 지웁니다"를 다음 뜻으로 바꾼다. 탈퇴를 신청하면 즉시 다른 이용자에게 보이지 않게 하고, 신청 후 14일 동안 복구를 위해 보관한 뒤 지운다. 기간 안에 다시 로그인하면 취소할 수 있다. 서지 정보와 백업 문장은 유지한다.
  - 방침 제3조에 항을 추가한다: `탈퇴로 계정을 지운 뒤에는 백업 복구 때 삭제를 다시 반영하기 위해 회원 식별번호와 삭제 시각만 30일 동안 보관하고 지웁니다. 이 기록으로는 계정이나 기록을 되살릴 수 없습니다.`
  - 방침 제3조 4·5항: 푸시 구독은 "탈퇴 신청 시" 삭제하고, 이메일 소식 기록은 "탈퇴로 계정을 지울 때" 삭제한다고 적는다.
  - 방침 제8조 3항: 설정 화면에서 탈퇴를 신청할 수 있다고 반영한다.
  - `account-deletion.md`에 다음을 적는다.
    - 앱 흐름
    - 메일 요청 처리: 본인 확인 후 SQL Editor에서 `select public.request_account_deletion('<uuid>');`와 `delete from auth.sessions where user_id = '<uuid>';`를 실행한다. 앱 신청과 같은 14일 유예를 거친다.
    - cron 설치(`enable-account-deletion-cron.sql`, Vault 키)
    - 실패 확인 방법
    - 백업 복구 후 재반영: `account_deletion_purges`의 사용자를 다시 지운다. 백업 보관 기간이 30일을 넘으면 보관 기간을 그에 맞춘다.
  - `privacy-release.md`의 "탈퇴 및 미사용 이미지 처리"는 이 문서를 가리키도록 줄인다.

- [ ] **Step 1: 테스트 갱신.** 법률 문구를 스냅샷이나 문자열로 확인하는 기존 테스트가 있다면 새 문구로 고친다. 없다면 `texts.ts`에 `14일`과 `30일 동안`이 들어 있는지 확인하는 테스트 하나를 `lib/legal/__tests__/accountDeletion.test.ts`로 추가한다.
- [ ] **Step 2: 문구와 문서 수정.**
- [ ] **Step 3: 확인.** `npm test && npm run lint`를 실행하고, `/terms`와 `/privacy` 화면을 로컬에서 열어 개정 문구와 시행일을 확인한다.
- [ ] **Step 4: 커밋.** `docs: 탈퇴 14일 유예에 맞춰 약관과 방침을 개정한다`

### Task 9: 전체 검증과 Draft PR

- [ ] **Step 1:** `npm test && npm run lint && npm run test:db && npm run build`를 실행해 모두 통과하는지 확인한다.
- [ ] **Step 2: 실제 화면 확인.** `docs/operations/preview-server.md` 절차로 미리보기 서버를 띄우고, Supabase 응답 모킹(이전 작업의 `/tmp` 스텁 방식)으로 확인한다. 모바일 폭 390px, 라이트·다크, 키보드만으로 다음을 확인한다.
  - 설정 → 탈퇴하기 → 시트(비밀번호, OAuth 재인증, 오류) → 로그인 화면 안내
  - 복구 화면 → 취소 → 오늘
  - 실기기, iOS 설치형 PWA, 실제 Supabase 연동은 미검증으로 기록한다.
- [ ] **Step 3:** 브랜치를 push하고 Draft PR을 만든다. 본문은 AGENTS.md 형식(무엇이 달라지나요 / 어떻게 바꾸었나요 / 확인한 내용)을 따른다. 남은 운영 단계를 따로 적는다.
  - 프로덕션 마이그레이션 3개
  - Vault 키와 cron 설치
  - 공고일과 시행일 확정
  - 시행일까지 버튼이 닫혀 있는지 확인
  - 실기기 확인
