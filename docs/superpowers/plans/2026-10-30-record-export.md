# 기록 꺼내기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 책 한 권 또는 한 달의 내 기록을 마크다운으로 만들어 미리 보고, 기기에 맞게 공유·복사·파일 저장한다.

**Architecture:** 마크다운 생성은 `lib/export/recordMarkdown.ts`의 순수 함수다. 서버 라우트 `GET /api/export`가 RLS 아래에서 기록과 덧붙인 생각을 읽어 그 함수로 텍스트를 만들어 돌려준다. 달 후보는 새 security invoker RPC `get_entry_months()`의 집계로 받는다. 공용 `Sheet` 안의 `ExportRecordsSheet`를 책 메뉴와 책장 상단 바에서 연다.

**Tech Stack:** Next.js 16 App Router 라우트 핸들러, Supabase(RLS·RPC), React 19, `sonner`, vitest, PGlite 계약 테스트.

**Spec:** `docs/superpowers/specs/2026-10-30-record-export-design.md` (PR #161)

## Global Constraints

- 텍스트에는 기록만 담는다. 안내문·이모지·앱 UI 문구를 넣지 않는다.
- 문장 `>` 인용, 생각은 일반 문단, 둘 다 있으면 문장 → 생각.
- 기록 하나 = 제목 하나. 책: `## 2026년 9월 3일 · 24쪽`, 달: `### 10월 2일 · 112쪽`. 쪽수 `24쪽` / `24~31쪽`.
- 덧붙임: `- 2026년 10월 2일 덧붙임: …`, 이어지는 줄은 공백 2칸, 빈 줄은 공백 2칸 줄. 원래 기록을 따라간다.
- 날짜는 KST. 정렬은 날짜 → 작성 시각 오름차순. 달은 `user_book_id`별 묶음, 묶음 순서는 그달 첫 기록순.
- 비공개 여부를 표시하지 않고 비공개 기록·덧붙임도 넣는다. 시트에 "비공개 기록도 포함돼요"를 알린다.
- 버튼: `navigator.share` 있음 + `(pointer: coarse)` → 공유하기·복사하기, 그 밖 → 복사하기·파일로 저장.
- 파일 이름 `readiary-<책 제목>.md`, `readiary-2026-10.md`.
- 시트가 열릴 때만 가져온다. RLS·인증을 우회하지 않는다. 새 RPC는 `revoke … from public, anon` + `grant execute … to authenticated`.
- 덧붙인 생각은 `getReflectionFeature().enabled`일 때만 넣는다(기능이 꺼진 사람은 화면에서도 보지 못한다).

## Review Focus

- 문장·생각이 모두 빈 문자열/공백뿐인 기록 → 제목만 남지 않도록 건너뛴다 (Task 1 테스트 `skips entries without content`).
- `from_page`만, `to_page`만, `from == to` → `24쪽`, `to < from` 같은 이상값은 `from`만 (Task 1 `page labels`).
- 연도를 넘는 책(2025년 12월 ~ 2026년 1월) 머리말 기간은 뒤쪽도 연도를 쓴다 (Task 1 `period across years`).
- 파일 이름에 `/ \ : * ? " < > |`·제어문자·앞뒤 점/공백이 든 제목, 빈 제목 → 안전한 이름, 빈 제목은 `readiary-기록.md` (Task 1 `exportFileName`).
- 다른 사람의 `user_book_id`나 형식이 틀린 `month` → 404/400, 남의 기록이 섞이지 않는다 (Task 3 라우트 테스트, Task 2 계약 테스트).

---

### Task 1: 마크다운 생성 순수 함수

**Files:**
- Create: `lib/export/recordMarkdown.ts`
- Test: `lib/export/__tests__/recordMarkdown.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ExportReflection { body: string; createdAt: string } // ISO timestamptz
  export interface ExportEntry {
    id: string; date: string /* YYYY-MM-DD */; createdAt: string;
    quote: string | null; note: string | null;
    fromPage: number | null; toPage: number | null;
    reflections: ExportReflection[];
  }
  export interface ExportBook {
    userBookId: string; title: string; author: string | null; isFinished: boolean;
    entries: ExportEntry[];
  }
  export function bookMarkdown(book: ExportBook): string;
  export function monthMarkdown(month: string /* YYYY-MM */, books: ExportBook[]): string;
  export function exportFileName(base: string): string; // → 'readiary-<safe>.md'
  ```
  입력 순서와 무관하게 함수 안에서 정렬한다. 결과는 끝에 줄바꿈 하나.

- [ ] **Step 1: 실패하는 테스트** — 스펙 예시 그대로를 기대값으로:
  - `bookMarkdown` 스펙 "책 한 권" 예시(머리말 `정혜윤 · 2026년 9월 3일 ~ 10월 21일 · 완독`, 덧붙임 한 줄) 문자열 일치.
  - `same-day entries each get a heading, ordered by created_at`.
  - `multi-line quote prefixes every line with >`, `multi-line reflection indents continuation and blank lines by 2 spaces`.
  - `reflection written in the next month stays with its original entry` (덧붙임 날짜는 createdAt의 KST 날짜, `2026-10-01T16:00:00Z` → `2026년 10월 2일`).
  - `omits author, finished and page when absent` (머리말 줄이 기간만).
  - `skips entries without content`, `page labels`(`24쪽`, `24~31쪽`, from==to `24쪽`, to만 `31쪽`, to<from `24쪽`), `period across years`, `single-day period`.
  - `monthMarkdown('2026-10', …)` 스펙 "한 달" 모양: `# 2026년 10월의 기록`, `## 제목 — 저자`(저자 없으면 `## 제목`), `### 10월 2일 · 112쪽`, 책 묶음은 첫 기록순.
  - `exportFileName`: `'아무튼, 메모'` → `'readiary-아무튼, 메모.md'`, `'a/b:c?'` → `'readiary-a-b-c.md'`(금지 문자 연속은 `-` 하나, 끝 `-`·점·공백 제거), `''` → `'readiary-기록.md'`, `'2026-10'` → `'readiary-2026-10.md'`.
- [ ] **Step 2:** `npx vitest run lib/export` — FAIL(모듈 없음).
- [ ] **Step 3:** 구현. KST 날짜는 `date-fns-tz`의 `formatInTimeZone(createdAt, 'Asia/Seoul', 'yyyy-MM-dd')`, `entries.date`는 문자열 그대로 나눈다(`lib/dates.ts` 방식). 블록 사이는 빈 줄 하나.
- [ ] **Step 4:** `npx vitest run lib/export` — PASS.
- [ ] **Step 5:** 커밋 `feat: 책과 한 달의 기록을 마크다운으로 엮는 함수를 둔다`.

### Task 2: 기록이 있는 달 RPC

**Files:**
- Create: `supabase/migrations/20261030120000_entry_months.sql`
- Create: `supabase/tests/run-entry-months-contract.mjs`

**Interfaces:**
- Produces: `public.get_entry_months() returns table (month text /* YYYY-MM */, entry_count integer)` — 로그인 사용자 자신의 `entries.date` 기준, 최신 달 먼저. `language sql stable security invoker set search_path = ''`, 미로그인은 `reading_rhythm`처럼 예외.

- [ ] **Step 1:** 계약 테스트 작성 — `privacy-fixture-schema.sql` + `20260904000000_reclaim_rls_policies.sql` 위에 두 사용자 기록을 넣고, 사용자 A로 `set local role authenticated` + `request.jwt.claims`를 정한 뒤: A의 달만 나오고 개수가 맞는다, 최신 달이 먼저다, `anon`은 실행 권한이 없다(`has_function_privilege`).
- [ ] **Step 2:** `node supabase/tests/run-entry-months-contract.mjs` — FAIL(함수 없음).
- [ ] **Step 3:** 마이그레이션 작성(권한 줄 포함).
- [ ] **Step 4:** 테스트 PASS.
- [ ] **Step 5:** 커밋 `feat: 기록이 있는 달을 개수만 세어 돌려주는 RPC를 둔다`.

### Task 3: 꺼내기 API

**Files:**
- Create: `lib/export/server.ts`
- Create: `app/api/export/route.ts`, `app/api/export/months/route.ts`
- Test: `app/api/export/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 1 타입·함수, Task 2 RPC.
- Produces:
  - `GET /api/export?book=<user_book_id>` / `GET /api/export?month=YYYY-MM` → `200 { markdown: string, fileName: string, entryCount: number }`. 둘 다 없거나 형식 오류 400, 남의 책·없는 책 404, 미로그인 `unauthorized()`.
  - `GET /api/export/months` → `200 { months: { month: string; entryCount: number }[] }`.
  - 모든 응답 `Cache-Control: private, no-store, max-age=0`, `Vary: Cookie`.
- `lib/export/server.ts`: `loadBookExport(supabase, userId, userBookId): Promise<ExportBook | null>`, `loadMonthExport(supabase, userId, month): Promise<ExportBook[]>`, `loadReflections(supabase, entryIds): Promise<Map<string, ExportReflection[]>>`(100개씩 `.in`, `fetchAllRows`, `created_at,id` 정렬). 기록 조회는 `entries` + `user_books!inner(id,user_id,is_finished, books(title,author))`를 `user_books.user_id = userId`로 거르고 `fetchAllRows`로 끝까지 읽는다. 달은 `date >= YYYY-MM-01`, `< 다음 달 1일`.

- [ ] **Step 1:** 라우트 테스트 — 기존 `app/api/books/new/__tests__/route.test.ts`의 모킹 방식을 따라: 미로그인 401, `month=2026-13` 400, `book`이 uuid 아님 400, 책 없음 404, 정상 응답의 `fileName`과 `markdown` 첫 줄, 캐시 헤더.
- [ ] **Step 2:** FAIL 확인.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** PASS 확인.
- [ ] **Step 5:** 커밋 `feat: 책 한 권과 한 달의 기록을 마크다운으로 내려주는 API를 둔다`.

### Task 4: 꺼내기 시트와 입구

**Files:**
- Create: `lib/export/exportActions.ts`, `lib/export/__tests__/exportActions.test.ts`
- Create: `components/export/ExportRecordsSheet.tsx`
- Modify: `components/books/BookActionsMenu.tsx`(행 "기록 꺼내기"), `components/books/BooksView.tsx`(상단 바 아이콘, 책이 있을 때만)

**Interfaces:**
- `exportActions(env: { canShare: boolean; coarsePointer: boolean }): readonly ['share', 'copy'] | readonly ['copy', 'download']`
- `ExportRecordsSheet({ open, onClose, scope })`, `scope: { kind: 'book'; userBookId: string } | { kind: 'month' }`.

- [ ] **Step 1:** `exportActions` 테스트(네 조합) → FAIL → 구현 → PASS.
- [ ] **Step 2:** 시트 구현. 열릴 때 `apiFetch`로 가져오고 닫히면 상태를 비운다. 달 범위는 달 칩 목록(`Chip`, 가로 스크롤, 첫 칩 = 최신 달 선택)과 본문을 각각 로딩·오류(다시 시도)·빈 상태로 나눈다. 미리보기는 `<pre>` 원문(산세리프, `whitespace-pre-wrap`, 헤어라인, 그림자 없음, `max-h-[46dvh]` 스크롤, `tabIndex=0`). 버튼은 `Button` 주요/보조. 복사 성공 `toast.success('복사했어요')`, 실패 시 미리보기를 직접 선택하라는 안내. 공유 `AbortError`는 조용히. 저장은 `Blob` + `a[download]`. 공유는 `{ title, text }`.
- [ ] **Step 3:** 입구 연결. 책 메뉴는 메뉴를 닫고 시트를 연다(`FileText` 아이콘). 책장은 `TopBarActions`에 `aria-label="기록 꺼내기"` 아이콘.
- [ ] **Step 4:** `npm run lint`, `npx tsc --noEmit`, `npm test`.
- [ ] **Step 5:** 화면 확인 — 모바일 폭·데스크톱, 라이트·다크, 키보드(열기·칩·버튼·Esc), 로딩·빈 달·오류·성공. 실기기(iOS PWA/Safari 공유 시트)는 미검증으로 남긴다.
- [ ] **Step 6:** 커밋 `feat: 책 메뉴와 책장에서 내 기록을 마크다운으로 꺼낸다`.

### 큰 범위 처리

한 달·한 권은 상한을 두지 않는다. `fetchAllRows`가 1,000행 단위로 끝까지 읽으므로 한 달 1,000건 이상도 잘리지 않는다. 미리보기는 텍스트 하나라 렌더 비용이 작다.
