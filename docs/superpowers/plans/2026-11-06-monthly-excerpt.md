# 달의 발췌집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 독자가 끝난 달의 문장을 여러 책에서 골라 한 권으로 엮고, 다시 읽고, 이미지로 내보내고, 친구에게 보여 주게 한다.

**Architecture:** `monthly_excerpts`(한 사람·한 달 한 권)와 `monthly_excerpt_items`(기록을 가리키는 순서 행)를 소유자 전용 RLS로 두고, 쓰기는 RPC로만 한다. 친구 읽기는 비공개 기록을 걸러 번호를 다시 매긴 SECURITY DEFINER RPC로만 열어 비공개의 존재가 새지 않게 한다. 내 화면(Phase A, Task 1~6)을 먼저 내고, 친구 공개·반응·피드(Phase B, Task 7~9)는 그 위에 붙인다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Postgres/RLS, Tailwind 토큰, vitest(순수 로직), PGlite(SQL 계약 테스트).

**Spec:** [docs/superpowers/specs/2026-11-05-monthly-excerpt-design.md](../specs/2026-11-05-monthly-excerpt-design.md). 시안은 [docs/design/monthly-excerpt-2026-11/](../../design/monthly-excerpt-2026-11/).

## Global Constraints

- 사용자 문구: 기능 이름 **달의 발췌집**, 동사 **엮기**. 버튼: `엮기`, `펼치기`, `문장 고르기`, `다음에`, `순서 정하기`, `미리보기`, `문장 다시 고르기`, `한 페이지로 펼치기`, `다시 묶기`, `달의 발췌집 모두 보기`, `친구에게 보여 주기`, `나만 보기`. 안내: `3월을 엮어 볼까요?`, `아직 엮지 않았어요`, `생각 3개도 함께 보여요`, `문장 2개는 친구에게 보이지 않아요`, `비공개 문장이 포함돼요`.
- 달 단위는 `entries.date`, 문자열은 `'YYYY-MM'`. "끝난 달"은 KST 오늘이 속한 달보다 앞선 달이다.
- 후보: `entries.quote ~ '[^[:space:]]'`인 내 기록. 생각은 `note`만 쓴다(덧붙인 생각 `reflections`는 이번 범위 밖).
- 표제지 문구: `네 권의 책에서 문장 열두 개를 골랐습니다.` 숫자는 `koreanCount`(`components/books/ExcerptBooklet.tsx`)를 쓴다.
- 친구 접근은 RPC와 RLS에서 막는다. 화면 필터에 기대지 않는다. 비공개 기록의 id, 개수, 순서 번호의 빈틈이 친구 응답에 없어야 한다.
- 새 함수는 `search_path = ''`, `revoke all ... from public, anon`, `grant execute ... to authenticated`. 새 테이블 권한은 명시적으로 준다(`docs/operations/supabase-api-grants.md`).
- 임의 hex 금지, 간지는 `.vellum-slip`, 문장은 `font-serif`, 도구는 `font-sans`, 일반 컴포넌트에서 `dark:` 분기 금지, 아이콘은 `lucide-react` 1.75.
- 브라우저 요청은 `apiFetch`, API 라우트 인증은 `getServerUser` + `unauthorized`. 후보는 페이지 단위(한 번 30개)로 가져온다.
- 마이그레이션은 추가만 한다. 옛 코드가 돌아가는 동안 먼저 적용해도 안전해야 한다. 프로덕션 적용은 머지·배포와 별개로 보고한다.
- PR은 Draft로, 제목과 본문에 행동의 언어를 쓴다. UI 검증은 모바일 폭, 아이패드 Safari, 라이트·다크, 키보드, 로딩·빈 상태·오류·성공을 구분해 PR에 적고, 못 한 조건은 미검증으로 적는다.

## Review Focus

1. **친구가 비공개 문장이 섞인 발췌집을 볼 때:** 표지, 수, 책 목록, 순서 번호 어디에도 비공개의 흔적이 없어야 한다. → Task 7 계약 테스트.
2. **엮은 뒤 기록을 고칠 때:** 날짜를 다른 달로 옮기거나 문장을 지워 생각만 남기면 그 항목은 발췌집에서 빠지고, 남은 항목이 없으면 발췌집도 지워진다. → Task 1 계약 테스트.
3. **고르는 사이 기록이 사라질 때:** 저장 시 없는 기록이 있으면 조용히 빼지 않고 `stale_entries`로 알리고, 화면은 후보를 다시 불러온 뒤 고른 내용을 최대한 유지한다. → Task 1 계약 테스트, Task 2 순수 함수.
4. **두 번 누르거나 공개를 껐다 켤 때:** 한 달에 한 권만 남고, `first_shared_at`은 처음 공개 때만 찍혀 피드에 다시 뜨지 않는다. → Task 1 계약 테스트.
5. **KST 달 경계:** 3월 31일 23:50 KST에는 3월을 엮을 수 없고, 4월 1일 00:10 KST(UTC로는 3월)에는 엮을 수 있다. → Task 1 계약 테스트, Task 2 `isFinishedMonth` 테스트.

---

## 파일 구조

```
supabase/migrations/20261106090000_monthly_excerpts.sql            Task 1 테이블·RPC·트리거
supabase/migrations/20261106110000_monthly_excerpts_friends.sql    Task 7 친구 읽기
supabase/migrations/20261106120000_monthly_excerpt_reactions.sql   Task 8 반응·알림
supabase/migrations/20261106130000_social_feed_items.sql           Task 9 피드
supabase/tests/run-monthly-excerpts-contract.mjs                   계약 테스트 실행기
supabase/tests/monthly_excerpts_*_contract.sql                     계약 테스트
lib/monthly-excerpt/month.ts                                       달 계산·라벨
lib/monthly-excerpt/compose.ts                                     고르기·순서 상태 순수 함수
lib/monthly-excerpt/model.ts                                       표제지·책 목록·공개 영향 문구
lib/monthly-excerpt/types.ts                                       공용 타입
lib/monthly-excerpt/server.ts                                      서버 조회 함수
app/api/monthly-excerpts/...                                       저장·삭제·후보 API
app/(app)/excerpts/page.tsx                                        모아 보기
app/(app)/excerpts/[month]/page.tsx                                읽기
app/(app)/excerpts/[month]/compose/page.tsx                        엮기
app/(app)/social/u/[nicknameAndTag]/excerpts/...                   친구 읽기·모아 보기
components/monthly-excerpt/                                        Reader, PastedPage, Composer, Archive, Prompt, FeedCard
```

`loading.tsx`는 기존 발췌집(`ExcerptSkeleton`)처럼 각 페이지에 둔다.

---

## Phase A — 내 화면

### Task 1: 데이터 모델과 소유자 RPC

**Files:**
- Create: `supabase/migrations/20261106090000_monthly_excerpts.sql`, `supabase/tests/run-monthly-excerpts-contract.mjs`, `supabase/tests/monthly_excerpts_owner_contract.sql`
- Modify: `types/supabase.d.ts`, `supabase/tests/fixtures/prod-public-schema.json`, `docs/operations/supabase-api-grants.md`

**Interfaces:**
- Produces (테이블):
  - `monthly_excerpts(id uuid pk, user_id uuid → profiles cascade, month date check(extract(day from month)=1), is_shared boolean not null default false, first_shared_at timestamptz, created_at, updated_at, unique(user_id, month))`
  - `monthly_excerpt_items(excerpt_id uuid → monthly_excerpts cascade, entry_id uuid → entries cascade, position integer check(position >= 1), primary key(excerpt_id, entry_id), unique(excerpt_id, position))`, `entry_id` 인덱스
- Produces (RPC, 모두 인증 필요, 시그니처 고정):
  - `save_monthly_excerpt(p_month text, p_entry_ids uuid[], p_is_shared boolean) returns uuid` — SECURITY DEFINER. 예외 메시지: `month_not_finished`, `no_entries`, `stale_entries`(`DETAIL`에 해당 id의 JSON 배열), `no_public_quotes`
  - `set_monthly_excerpt_shared(p_id uuid, p_is_shared boolean) returns void` — SECURITY DEFINER. 예외: `not_found`, `no_public_quotes`
  - `get_my_monthly_excerpt(p_month text) returns jsonb` — `{id, month, isShared, firstSharedAt, items:[{position, entryId, date, quote, note, isPrivate, fromPage, toPage, book:{id,title,author}}]}` 또는 `null`
  - `get_monthly_excerpt_candidates(p_month text, p_user_book_id uuid default null, p_page int default 0, p_limit int default 30) returns jsonb` — `[{entryId,date,quote,hasNote,isPrivate,fromPage,toPage,userBookId,bookTitle}]`, 날짜·created_at 오름차순, `p_limit` 상한 50
  - `get_monthly_excerpt_month_books(p_month text) returns table(user_book_id uuid, title text, quote_count int)`
  - `get_my_monthly_excerpt_years() returns table(year int, excerpt_count int, has_unmade boolean)`
  - `get_my_monthly_excerpt_year(p_year int) returns jsonb` — `[{month, quoteCount, excerptId, isShared, coverQuote}]` 최신 달 먼저. 끝난 달 중 문장이 있는 달만
  - `get_monthly_excerpt_prompt(p_today date) returns jsonb` — 지난달에 문장이 있고 아직 엮지 않았으면 `{month, quoteCount, bookCount}`, 아니면 `null`

- [ ] **Step 1: 실행기 작성.** `run-monthly-excerpts-contract.mjs`: `run-migration-chain-contract.mjs`의 Supabase 스텁(역할, `auth.users`, `auth.uid()`, storage)을 재사용하도록 그 스텁을 `supabase/tests/stubs.mjs`로 빼고, 전체 마이그레이션 적용 뒤 인자로 받은 SQL 파일을 실행한다. 실패 시 exit 1. `node supabase/tests/run-monthly-excerpts-contract.mjs <sql>`로 돈다(`@electric-sql/pglite` devDependency 사용).

- [ ] **Step 2: 실패하는 계약 테스트 작성.** `monthly_excerpts_owner_contract.sql`에 사용자 A·B, 책 2권, 3월 문장 3개(공개 2, 비공개 1), 생각만 있는 3월 기록 1개, 4월 문장 1개를 두고 다음을 `raise exception`으로 확인한다.
  - anon은 새 함수 execute 불가, authenticated는 가능.
  - 저장 후 `items` 순서가 입력 순서, `position` 1부터.
  - 같은 달 재저장 시 행 1개이고 id 유지.
  - 다른 사람 기록, 다른 달 기록, 생각만 있는 기록, 없는 id, 중복 id를 넣으면 `stale_entries`이고 `DETAIL`에 그 id만 있음.
  - 빈 배열은 `no_entries`, 비공개만 고르고 `p_is_shared=true`면 `no_public_quotes`.
  - `now()`를 고정할 수 없으므로 끝난 달 판정은 `monthly_excerpt_kst_today()`(내부 함수, 재정의 가능)를 거치게 하고, 테스트에서 재정의해 3월 31일 23:50 KST는 `month_not_finished`, 4월 1일은 통과를 확인한다.
  - 공개 저장 시 `first_shared_at` 설정. `set_monthly_excerpt_shared(false)` 뒤 `true`로 돌려도 값이 그대로.
  - 기록의 `date`를 4월로 옮기거나 `quote`를 null로 바꾸면 항목이 빠지고, 마지막 항목이 빠지거나 기록을 지우면 발췌집도 지워짐. 다만 `save_monthly_excerpt` 재저장 도중에는 지워지지 않음.
  - B는 A의 두 테이블 행을 읽을 수 없고, A도 테이블에 직접 insert/update 불가(권한 없음), A는 delete 가능.
  - 후보는 비공개를 포함하고 `isPrivate`가 맞으며 B가 부르면 A의 기록이 나오지 않음.
  - `get_my_monthly_excerpt_year`는 진행 중인 달과 문장 없는 달을 제외.
  - `get_monthly_excerpt_prompt`는 엮으면 `null`.

- [ ] **Step 3: 테스트가 실패하는지 확인.** Run: `node supabase/tests/run-monthly-excerpts-contract.mjs supabase/tests/monthly_excerpts_owner_contract.sql`. Expected: 함수 없음으로 FAIL.

- [ ] **Step 4: 마이그레이션 구현.** 포인트만 정한다.
  - RLS: 두 테이블 소유자만 select, `monthly_excerpts`는 소유자 delete. authenticated에는 `select`, `delete`(excerpts), `select`(items)만 grant.
  - 재저장은 트랜잭션 안에서 items를 지우고 다시 넣는다. `unique(excerpt_id, position)` 충돌을 피하려고 지운 뒤 넣는다.
  - 빈 발췌집 정리는 `after delete on monthly_excerpt_items`의 **deferred constraint trigger**로 한다. 트랜잭션 끝에 항목이 없으면 부모를 지운다.
  - 기록 수정 반영은 `after update of date, quote on entries` 트리거로 한다. 달이 바뀌거나 문장이 비면 그 항목을 지운다(SECURITY DEFINER). 항목 삭제로 생긴 빈 번호는 읽을 때 `row_number()`로 메운다.
  - `first_shared_at = coalesce(first_shared_at, now())`, 공개일 때만.

- [ ] **Step 5: 통과 확인.** 같은 명령. Expected: 출력 없이 exit 0.

- [ ] **Step 6: 체인 계약과 타입 갱신.** `prod-public-schema.json`에 새 테이블·함수를 추가하고(`docs/operations/supabase-api-grants.md`에 이 마이그레이션이 프로덕션 미적용 상태의 예상치임을 적음) `types/supabase.d.ts`에 수동 반영. Run: `PGLITE_MODULE=node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/run-migration-chain-contract.mjs`, `npx tsc --noEmit`. Expected: 모두 통과.

- [ ] **Step 7: Commit.** `git add supabase types docs/operations && git commit -m "feat: 달의 발췌집을 저장하는 테이블과 소유자 RPC를 둔다"`

### Task 2: 순수 로직

**Files:**
- Create: `lib/monthly-excerpt/{types,month,compose,model}.ts`, `lib/monthly-excerpt/__tests__/{month,compose,model}.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `MonthKey = string`, `ExcerptItem`, `MonthlyExcerpt`, `Candidate`, `MonthBook`, `YearRow`, `ExcerptMonthRow`, `ExcerptPrompt`(Task 1 JSON의 카멜 형태)
  - `month.ts`: `isFinishedMonth(month: MonthKey, todayKst: string): boolean`, `monthLabel(month): string`('2026년 3월'), `shortMonthLabel(month): string`('3월'), `isMonthKey(s: string): boolean`
  - `compose.ts`: `togglePick(picks: ExcerptPick[], c: ExcerptPick): ExcerptPick[]`, `movePick(picks, id: string, delta: -1 | 1): ExcerptPick[]`, `reorderPick(picks, from: number, to: number)`, `reconcilePicks(picks, staleIds: string[]): ExcerptPick[]`. `ExcerptPick = { entryId, quote, date, bookTitle, isPrivate, hasNote }`
  - `model.ts`: `titlePageSentence(items, ownerName?: string): string`, `bookTally(items): {title, count}[]`(많은 순, 같으면 먼저 나온 순), `bookTallyForDisplay(items, max = 2)`(`외 2권` 줄 포함), `shareImpact(picks): {privateCount, noteCount, publicCount, lines: string[]}`, `coverItem(items, viewer: 'owner' | 'friend')`

- [ ] **Step 1: 실패 테스트 작성.** 핵심 단언:

```ts
expect(isFinishedMonth('2026-03', '2026-03-31')).toBe(false);
expect(isFinishedMonth('2026-03', '2026-04-01')).toBe(true);
expect(isFinishedMonth('2025-12', '2026-01-01')).toBe(true);
expect(monthLabel('2026-03')).toBe('2026년 3월');
expect(titlePageSentence(fourBooksTwelve)).toBe('네 권의 책에서 문장 열두 개를 골랐습니다.');
expect(titlePageSentence(oneBookOne)).toBe('한 권의 책에서 문장 한 개를 골랐습니다.');
expect(titlePageSentence(fourBooksTwelve, '민지')).toBe('민지가 네 권의 책에서 문장 열두 개를 골랐습니다.');
expect(shareImpact(picks).lines).toEqual(['생각 3개도 함께 보여요', '문장 2개는 친구에게 보이지 않아요']);
expect(shareImpact(allPublicNoNotes).lines).toEqual([]);
expect(movePick([a, b, c], 'a', -1)).toEqual([a, b, c]); // 맨 앞에서 위로는 그대로
expect(movePick([a, b, c], 'a', 1)).toEqual([b, a, c]);
expect(reconcilePicks([a, b, c], ['b'])).toEqual([a, c]); // 순서 유지
expect(coverItem([privateItem, publicItem], 'friend')).toBe(publicItem);
expect(coverItem([privateItem, publicItem], 'owner')).toBe(privateItem);
expect(bookTallyForDisplay(fourBooks, 2).at(-1)).toEqual({ title: '외 2권', count: 3 });
```

- [ ] **Step 2: 실패 확인.** Run: `npx vitest run lib/monthly-excerpt`. Expected: 모듈 없음으로 FAIL.
- [ ] **Step 3: 구현.** 함수는 불변. `shareImpact`의 `noteCount`는 공개 항목 중 생각 있는 수만 센다.
- [ ] **Step 4: 통과 확인.** 같은 명령. Expected: PASS.
- [ ] **Step 5: Commit.** `feat: 달의 발췌집의 달 계산과 고르기 규칙을 둔다`

### Task 3: 서버 조회와 API

**Files:**
- Create: `lib/monthly-excerpt/server.ts`, `app/api/monthly-excerpts/route.ts`, `app/api/monthly-excerpts/[id]/route.ts`, `app/api/monthly-excerpts/candidates/route.ts`, `app/api/monthly-excerpts/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 1 RPC, Task 2 타입
- Produces:
  - `server.ts`: `fetchMyMonthlyExcerpt(month): Promise<MonthlyExcerpt | null>`, `fetchMonthBooks(month): Promise<MonthBook[]>`, `fetchMyExcerptYears(): Promise<YearRow[]>`, `fetchMyExcerptYear(year): Promise<ExcerptMonthRow[]>`, `fetchExcerptPrompt(todayKst): Promise<ExcerptPrompt | null>`, `fetchMyExcerptMonths(): Promise<Set<MonthKey>>`, `fetchMyExcerptCount(): Promise<number>`
  - `POST /api/monthly-excerpts` `{month, entryIds, isShared}` → `200 {id}` | `422 {code, error, staleIds?}`(`code`는 Task 1 예외값, `staleIds`는 `DETAIL`에서)
  - `PATCH /api/monthly-excerpts/[id]` `{isShared}`, `DELETE /api/monthly-excerpts/[id]` → `204`
  - `GET /api/monthly-excerpts/candidates?month&userBookId&page` → `{items, hasMore}`(`limit+1`로 판정)
  - `GET /api/monthly-excerpts?year=2025` → `{months: ExcerptMonthRow[]}`(접힌 해 펼칠 때)

- [ ] **Step 1: 실패 테스트.** `app/api/export/__tests__/route.test.ts`의 모킹 방식을 따른다. 단언: 비로그인 401; `month` 형식 오류 400; `entryIds`가 배열 아님 400, 500개 초과 400; RPC가 `stale_entries`를 던지면 422와 `code:'stale_entries'`, `staleIds`; 알 수 없는 오류는 500이며 내부 메시지를 돌려주지 않음.
- [ ] **Step 2: 실패 확인.** Run: `npx vitest run app/api/monthly-excerpts`. Expected: FAIL.
- [ ] **Step 3: 구현.** 응답 문구: `stale_entries` → `고르는 사이 바뀐 기록이 있어요. 다시 불러올게요.`, `no_public_quotes` → `친구에게 보일 문장이 없어요. 나만 보기로 엮어 주세요.`, `month_not_finished` → `아직 끝나지 않은 달이에요.`, `no_entries` → `문장을 하나 이상 골라 주세요.`
- [ ] **Step 4: 통과 확인.** 같은 명령. Expected: PASS.
- [ ] **Step 5: Commit.** `feat: 달의 발췌집을 저장하고 후보를 불러오는 API를 둔다`

### Task 4: 엮기 흐름

**Files:**
- Create: `app/(app)/excerpts/[month]/compose/{page,loading}.tsx`, `components/monthly-excerpt/{ComposeFlow,PickStep,OrderStep,PreviewStep}.tsx`
- Modify: `lib/shell/routes.ts`(`/excerpts`를 `tabFor`에서 `me`로), `lib/shell/__tests__/` 해당 테스트

**Interfaces:**
- Consumes: Task 2 `compose`, `model`, Task 3 API, Task 5 `MonthlyExcerptReader`(미리보기는 같은 컴포넌트에 `preview` prop)
- Produces: `/excerpts/[month]/compose`. 페이지는 끝나지 않은 달, 형식 오류이면 `notFound()`, 기존 발췌집이 있으면 `initialPicks`로 넘긴다.

- [ ] **Step 1: 라우팅 테스트 후 구현.** `tabFor('/excerpts/2026-03/compose') === 'me'`, `frameFor`는 `plain`. Run: `npx vitest run lib/shell`.
- [ ] **Step 2: `PickStep`.** 시안 `picking-quotes.html` A. 칩은 `get_monthly_excerpt_month_books`로 서버에서 받아 초기에 그린다. 후보는 `전체` 칩 기준 첫 30개를 페이지가 내려주고, 칩 전환과 '더 보기'는 API. 칩과 목록의 로딩·실패·재시도는 분리. 체크는 `<input type="checkbox">` 라벨 구조로 키보드·낭독기를 지원한다. 긴 문장은 3줄 `line-clamp`와 `전체 보기` 버튼. 메타는 책·날짜·`생각 있음`·`비공개`. 하단 고정 줄 `고른 문장 N`을 누르면 고른 문장만 보이고, `initialPicks`가 있으면 그 보기로 시작한다.
- [ ] **Step 3: `OrderStep`.** 위·아래 버튼을 기본으로 하고, 끌어서 옮기기는 `Pile`처럼 포인터 이벤트로 직접 구현한다(새 의존성 없음). 버튼 이동 뒤 포커스를 같은 버튼에 유지하고 `aria-live`로 `3번째로 옮겼어요`를 알린다. `첫 문장이 친구 피드의 표지가 돼요` 안내. `문장 다시 고르기`로 돌아가도 상태 유지.
- [ ] **Step 4: `PreviewStep`.** Reader를 `preview`로 그리고, 공개 선택은 `lib/monthly-excerpt/flags.ts`의 `MONTHLY_EXCERPT_SHARING = false`가 꺼져 있는 동안 숨기고 `isShared:false`로 저장한다. 켜지면(Task 7) 라디오 그룹 `친구에게 보여 주기 / 나만 보기`, 선택 전 `엮기` 비활성, `shareImpact` 문구, 공개 문장이 없으면 친구 항목 비활성과 이유를 보인다. 켠 상태도 이 Task에서 구현하고 플래그를 잠시 바꿔 확인한다. 저장은 `apiFetch` + `useActionLock`. `stale_entries`이면 `reconcilePicks(picks, staleIds)`를 적용하고 고르기 단계로 돌아가 후보를 다시 불러오며 서버 문구를 토스트로 보인다. 성공 시 `/excerpts/[month]`로 이동.
- [ ] **Step 5: 이탈 경고.** 고른 것이 있으면 `beforeunload`와 상단 바 뒤로가기에서 `고른 문장이 사라져요` 확인.
- [ ] **Step 6: 브라우저 확인.** 목킹된 세션 또는 미리보기 서버에서 38개 문장 기준 칩 전환, 키보드로 체크·순서 변경, 빈 후보, 후보 실패 재시도, 다크, 모바일 폭. Expected: 모두 동작. 결과를 PR에 기록.
- [ ] **Step 7: Commit.** `feat: 끝난 달의 문장을 골라 순서를 정하고 엮는다`

### Task 5: 읽는 화면

**Files:**
- Create: `app/(app)/excerpts/[month]/{page,loading}.tsx`, `components/monthly-excerpt/{MonthlyExcerptReader,PastedPage,MonthlyExcerptExport}.tsx`, `components/monthly-excerpt/pasted.module.css`
- Modify: `components/books/ExcerptBooklet.tsx`, `components/books/ExportExcerptsButton.tsx`

**Interfaces:**
- Consumes: Task 2 `model`, Task 3 `fetchMyMonthlyExcerpt`, `Pile`
- Produces: `MonthlyExcerptReader({ month, items, viewer: 'owner'|'friend', ownerName?, preview?, actions? })`. Task 4, 7이 재사용한다.
- Produces: `ExcerptBookletProps`에 선택 prop `monthly?: { label: string; books: {title: string; count: number}[] }`, `quotes[].bookTitle?: string`. `ExportExcerptsButton`에 `notice?: string`. 기존 책별 호출은 모양이 바뀌지 않는다.

- [ ] **Step 1: Reader.** 시안 `material-trial.html` A + `inside-look.html` B. `ExcerptReader`의 표제지 레이아웃과 `Pile` 사용을 따른다. 장 맨 위 책 이름, 문장, `note`(왼쪽 짧은 선), 아래 `p.88` / `3월 14일`. 긴 내용은 장 안에서 스크롤되어 끝까지 읽을 수 있어야 한다. 소유자 화면은 비공개 항목에 작은 `비공개` 표시.
- [ ] **Step 2: PastedPage.** `한 페이지로 펼치기` ↔ `다시 묶기`. 시안 C. 여백선은 `pasted.module.css`에서 `--margin` 토큰으로 그린다(틀 판정은 바꾸지 않음). 조각은 `.vellum-slip`, 기울기는 `-0.5°~0.6°`, 좌우 어긋남 0~12px. **WebKit 규칙:** 기울인 요소를 넓힌 상자 안에 넣는다(`components/ui/Pile.tsx`와 PR #83 방식). `prefers-reduced-motion`은 기울임과 무관, 전환 애니메이션만 끈다.
- [ ] **Step 3: 소유자 동작.** 페이지가 `fetchMyMonthlyExcerpt`로 읽는다. 없으면 `/excerpts/[month]/compose`로 redirect. 상단 바 공유 아이콘은 이미지 내보내기, 그 밖에 `고치기`, 공개 전환(`MONTHLY_EXCERPT_SHARING`이 켜졌을 때만, PATCH, 전환 전에 `shareImpact` 안내), 삭제(`Sheet` 확인, 문구 `달의 발췌집만 지워져요. 남긴 기록은 그대로예요.`).
- [ ] **Step 4: 내보내기.** `MonthlyExcerptExport`가 `ExportExcerptsButton`을 `monthly`와 함께 연다. 비공개 항목이 있으면 `notice='비공개 문장이 포함돼요'`. 표제지에 달과 책, 각 카드에 책 이름. 책별 발췌집에서 내보내기 모양이 그대로인지 눈으로 비교.
- [ ] **Step 5: 브라우저 확인.** 문장 1개, 긴 문장+긴 생각, 여러 책, 20개 달의 묶음과 펼친 페이지, 다크, 키보드(다음 장·펼치기), iPad 뷰포트. 실제 아이패드 Safari 유령 선은 실기기가 있을 때만 확인으로 적는다.
- [ ] **Step 6: Commit.** `feat: 엮은 달을 간지 묶음과 오려 붙인 한 페이지로 다시 읽는다`

### Task 6: 진입점과 모아 보기

**Files:**
- Create: `app/(app)/excerpts/{page,loading}.tsx`, `components/monthly-excerpt/{MonthlyExcerptArchive,MonthPrompt}.tsx`, `lib/monthly-excerpt/__tests__/prompt.test.ts`, `lib/monthly-excerpt/promptDismiss.ts`
- Modify: `app/(app)/today/page.tsx`, `components/today/TodayView.tsx`, `app/(app)/profile/(me)/page.tsx`, `components/profile/MeView.tsx`, `components/profile/meModel.ts`, `components/books/BooksView.tsx`, `app/(app)/books/(shelf)/page.tsx`

**Interfaces:**
- Consumes: Task 3 `fetchExcerptPrompt`, `fetchMyExcerptYears`, `fetchMyExcerptYear`, `fetchMyExcerptMonths`, `fetchMyExcerptCount`
- Produces: `MonthlyExcerptArchive({ years, firstYearMonths, viewer, hrefFor })`(Task 7 재사용). `MonthRow`에 `monthKey`, `excerpt: 'made' | 'unmade' | 'none'`.

- [ ] **Step 1: 실패 테스트.** `promptDismiss.ts`: `isPromptDismissed(month)`, `dismissPrompt(month)`(`localStorage` 키 `readiary:month-prompt:2026-03`, 저장 실패 무시, `PolicyNotice` 방식). `meModel`: 끝난 달에 문장이 있고 안 엮었으면 `unmade`, 엮었으면 `made`, 진행 중인 달이나 문장 없는 달은 `none`. Run: `npx vitest run lib/monthly-excerpt components/profile`. Expected: FAIL.
- [ ] **Step 2: 구현 후 통과 확인.** 같은 명령. Expected: PASS.
- [ ] **Step 3: 오늘.** `recall`처럼 `fetchExcerptPrompt`를 기다리지 않고 Promise로 넘겨 도착하면 나타나게 한다. 표시 기간은 그달 1~7일 KST. 시안 ①. `문장 고르기`(`/excerpts/2026-03/compose`), `다음에`(dismiss). 조회 실패는 조용히 안 보임.
- [ ] **Step 4: 프로필.** `MonthList`의 줄은 지금 전체가 링크라 그 안에 행동을 못 넣는다. 줄을 링크 + 형제 행동 링크 구조로 바꾸고 `grid`에 칸을 더한다. `엮기`, `펼치기`를 두고 아래에 `달의 발췌집 모두 보기`. 프로필은 모바일 `limit=3`과 데스크톱 전체, 양쪽을 모두 고친다. 엮은 달 조회 실패 시 행동만 숨기고 목록은 유지한다.
- [ ] **Step 5: 책장.** '다 읽은 책' 위에 `달의 발췌집 N권 · 모두 보기` 한 줄(모바일·데스크톱 두 블록). 0권이고 엮을 달도 없으면 숨김.
- [ ] **Step 6: 모아 보기.** 시안 `entry-and-archive.html` A. 첫 해를 서버에서 그리고, 접힌 해는 펼칠 때 `GET /api/monthly-excerpts?year=`로 가져오며 해마다 실패·재시도. `<button aria-expanded>`. 안 엮은 달은 `text-ink-faint`로 `아직 엮지 않았어요`.
- [ ] **Step 7: 전체 검사.** Run: `npm test && npm run lint && npm run build`. Expected: 모두 통과. 환경값이 없어 빌드를 못 하면 그렇게 적는다.
- [ ] **Step 8: 브라우저 확인과 Commit.** 네 진입점 이동, 빈 상태, 다크, 모바일 폭, 키보드. `feat: 프로필·책장·오늘에서 달의 발췌집으로 들어가고 해마다 모아 본다`. **여기까지 Phase A의 Draft PR을 연다.** Phase A에서는 공개 선택이 꺼져 있어 모든 달의 발췌집이 나만 보기로 저장되므로, Phase B 배포 때 옛 발췌집이 피드에 몰려 뜨지 않는다. 이 사실을 PR에 적는다.

---

## Phase B — 친구에게 보여 주기

### Task 7: 친구 읽기

**Files:**
- Create: `supabase/migrations/20261106110000_monthly_excerpts_friends.sql`, `supabase/tests/monthly_excerpts_friend_contract.sql`, `app/(app)/social/u/[nicknameAndTag]/excerpts/page.tsx`, `app/(app)/social/u/[nicknameAndTag]/excerpts/[month]/page.tsx`
- Modify: `lib/monthly-excerpt/server.ts`, `components/social/library/FriendLibraryView.tsx`, 라이브러리 page, `types/supabase.d.ts`, `supabase/tests/fixtures/prod-public-schema.json`, `docs/operations/privacy-release.md`

**Interfaces:**
- Produces (RPC, DEFINER, 모두 안에서 `is_friend_with(owner)`와 `is_shared` 확인):
  - `can_view_monthly_excerpt(p_id uuid) returns boolean` — 소유자이거나, 친구이고 공유 중이며 공개 문장이 1개 이상
  - `get_friend_monthly_excerpt(p_owner uuid, p_month text) returns jsonb` — Task 1 형태에서 `isPrivate`, `firstSharedAt`을 빼고, 공개 문장만, `position`은 `row_number()`로 재번호
  - `get_friend_monthly_excerpt_years(p_owner uuid) returns table(year int, excerpt_count int)`
  - `get_friend_monthly_excerpt_year(p_owner uuid, p_year int) returns jsonb` — `[{month, quoteCount, excerptId, coverQuote}]` 친구에게 보이는 수와 표지
- 내부 전용: `monthly_excerpt_visible_items(p_id uuid)`(public 실행 권한 없음).
- Produces: 라이브러리 prop `monthlyExcerpts`, `monthlyExcerptsError`.

- [ ] **Step 1: 실패 계약 테스트.** A의 3월: 순서 [비공개 p, 공개 a, 비공개 q, 공개 b]. 단언:
  - 친구 C: 항목은 a, b이고 `position` 1, 2, 표지는 a, `quoteCount` 2, JSON 문자열에 p·q의 id와 문장이 없음, `isPrivate` 키 없음.
  - 친구가 아닌 D, anon, 나만 보기: `null`/빈 결과/`false`.
  - a, b를 비공개로 돌리면 C에게 `null`이고 A에게는 그대로. 다시 공개하면 복귀.
  - 친구 해제 뒤 `null`.
  - C가 테이블을 직접 읽으면 0행.
  Run: `node supabase/tests/run-monthly-excerpts-contract.mjs supabase/tests/monthly_excerpts_friend_contract.sql`. Expected: FAIL.
- [ ] **Step 2: 구현 후 통과 확인.** 같은 명령. Expected: exit 0.
- [ ] **Step 3: 화면.** 서재에 `달마다 엮은 발췌집`(최근 5개와 `모두 보기`). 읽기는 Reader `viewer='friend'`로, 내보내기·고치기 없음, 표제지에 `민지가 네 권의 책에서…`. 볼 수 없으면 `notFound()`. 기존 `isOwn`이면 내 화면으로 redirect. 소유자 Reader는 공유 중인데 공개 문장이 없으면 `친구에게 보일 문장이 없어 지금은 나만 볼 수 있어요`를 보인다. **이 Task의 마지막에 `MONTHLY_EXCERPT_SHARING = true`로 켠다.** 다만 Task 9까지 한 PR로 머지해 공개 선택과 피드가 같이 나가게 한다.
- [ ] **Step 4: 공개 범위 검증.** `docs/operations/privacy-release.md`에 시나리오를 추가하고 비공개 전환·친구 해제 뒤 페이지와 PWA 캐시 응답을 확인한다. `next.config`의 Workbox 런타임 캐시가 `/social/u`와 API를 어떻게 다루는지 확인하고 결과를 적는다.
- [ ] **Step 5: Commit.** `feat: 친구가 서재에서 달의 발췌집을 비공개 없이 읽는다`

### Task 8: 좋아요·댓글·알림

**Files:**
- Create: `supabase/migrations/20261106120000_monthly_excerpt_reactions.sql`, `supabase/tests/monthly_excerpts_reactions_contract.sql`, `app/api/monthly-excerpts/[id]/likes/route.ts`, `app/api/monthly-excerpts/[id]/comments/route.ts`, `lib/comments/target.ts`
- Modify: `components/comments/CommentBottomSheet.tsx`, `components/comments/CommentInput.tsx`, `components/social/useLike.ts`, `components/social/LikersBottomSheet.tsx`, `lib/notifications/{types,format}.ts`, `app/(app)/social/_components/NotificationList.tsx`, notifications 조회, `MonthlyExcerptReader`

**Interfaces:**
- Produces (테이블, 소유자 또는 `can_view_monthly_excerpt` 읽기, 쓰기는 `can_view` + 본인):
  - `monthly_excerpt_likes(user_id, excerpt_id, created_at, unique(user_id, excerpt_id))`
  - `monthly_excerpt_comments(id, excerpt_id, user_id, content, parent_id, client_comment_id, created_at)` — `comments`와 같은 제약
  - `notifications.monthly_excerpt_id uuid → monthly_excerpts on delete cascade`, `type`에 `excerpt_like`, `excerpt_comment` 추가
  - `notify_monthly_excerpt_event(p_excerpt_id uuid, p_type text, p_comment_id uuid default null)` — `notify_entry_event`와 같은 검증
- Produces: `lib/comments/target.ts`: `type CommentTarget = {kind:'entry'; entryId:string} | {kind:'monthly_excerpt'; excerptId:string}`, `commentsUrl(target, query?)`, `useLike(target: CommentTarget | string, …)`(기존 entryId 호출 유지)

- [ ] **Step 1: 실패 계약 테스트.** 친구 좋아요·댓글 가능, 소유자에게 알림 1건, 토글 반복에도 알림 1건, 자기 반응은 알림 없음. 나만 보기·공개 문장 없음 상태: 친구는 읽기·새 반응 불가, 소유자는 읽기 가능, **행은 유지**. 다시 공유하면 복귀. 발췌집 삭제 시 반응·알림 cascade. Expected: FAIL.
- [ ] **Step 2: 구현 후 통과 확인.** Expected: exit 0.
- [ ] **Step 3: API 테스트와 구현.** `app/api/likes`, `app/api/comments`의 동작(멱등 키, 스팸 방지, 응답 모양)과 같게. `CommentBottomSheet`는 `entryId` 대신 `target`을 받되 기존 호출을 모두 옮긴다. `CommentSection`은 건드리지 않는다. Run: `npx vitest run app/api/monthly-excerpts app/api/comments`. Expected: PASS.
- [ ] **Step 4: 알림.** 문구 `민지님이 달의 발췌집을 좋아해요`, `민지님이 달의 발췌집에 댓글을 남겼어요`. 링크는 내 `/excerpts/[month]`. Web Push 발송 경로가 타입을 필터링하면 새 타입 처리를 확인한다. `lib/notifications/__tests__` 갱신.
- [ ] **Step 5: 화면과 Commit.** Reader 아래에 `SocialActionBar`. 숨겨진 동안 소유자 화면에는 `친구에게 보이지 않는 동안 새 반응을 받지 않아요`. `feat: 달의 발췌집에 친구가 좋아요와 댓글을 남긴다`

### Task 9: 피드

**Files:**
- Create: `supabase/migrations/20261106130000_social_feed_items.sql`, `supabase/tests/monthly_excerpts_feed_contract.sql`, `components/monthly-excerpt/MonthlyExcerptFeedCard.tsx`
- Modify: `lib/queries/fetchSocialFeedEntries.ts`, `components/social/feed/SocialFeedView.tsx`, `types/entry.ts`, `docs/ui-guidelines.md`, `DESIGN.md`, `AGENTS.md`(주요 공간 표에 달의 발췌집)

**Interfaces:**
- Produces: 새 RPC `get_social_feed_items(p_page int, p_limit int) returns jsonb`. 항목 `{kind:'entry', ...기존 형태}` | `{kind:'monthly_excerpt', id, month, sharedAt, profile, coverQuote, coverBookTitle, quoteCount, bookCount, initialLiked, initialLikeCount, initialCommentCount}`. 둘을 `created_at`/`first_shared_at` 내림차순으로 합쳐 페이지한다. 옛 `get_social_feed`는 배포가 끝날 때까지 남긴다(후속 정리 이슈).
- Produces: `fetchSocialFeedItems(page, limit): Promise<SocialFeedItem[]>`. 기존 `fetchDetailSocialFeedEntries` 호출을 옮기되 reflection 요약은 entry 항목에만 붙인다.

- [ ] **Step 1: 실패 계약 테스트.** 공개 시 친구 피드에 1건, `first_shared_at` 순서로 entry와 섞임, 수정·재공개 뒤에도 1건이고 위치 불변, 나만 보기·공개 문장 없음·친구 아님이면 없음, 표지·수에 비공개 없음, 비공개 표지일 때 다음 공개 문장이 표지, 페이지 경계에서 중복·누락 없음. Expected: FAIL.
- [ ] **Step 2: 구현 후 통과 확인.** Expected: exit 0.
- [ ] **Step 3: 카드.** 시안 `friend-encounter.html` ①, 재질은 `.vellum`/`.vellum-slip` 겹침. `민지님이 발췌집을 엮었어요`, `달의 발췌집`, 달, 표지 문장, 출처, `문장 12 · 책 4권`, `펼치기`, 좋아요·댓글. `SocialFeedView`가 `kind`로 분기. `FeedPost`는 바꾸지 않는다. Run: `npx tsc --noEmit && npm test`. Expected: 통과.
- [ ] **Step 4: 문서.** ui-guidelines와 DESIGN.md에 달의 발췌집(묶음 + 오려 붙인 펼친 페이지)과 깊이 허용 범위를 적는다. AGENTS.md 공간 표에 한 줄.
- [ ] **Step 5: 최종 검사.** Run: `npm test && npm run lint && npm run build`, 모든 계약 테스트, 체인 계약. Expected: 통과.
- [ ] **Step 6: Commit과 PR.** `feat: 달의 발췌집을 친구 피드에 엮은 날 한 번 띄운다`. Phase B Draft PR을 열고, 본문에 프로덕션 마이그레이션 적용 순서(추가 전용, 코드 배포 전 적용), 미검증 조건, 후속 이슈(옛 `get_social_feed` 제거, 외부 링크, 임시 저장)를 적는다.
