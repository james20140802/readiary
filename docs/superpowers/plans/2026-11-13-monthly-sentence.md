# 달마다 한 문장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로필 일기장과 친구 서재에 달마다 문장 하나를 보이고, 독자가 그 문장을 고르거나 자동 기준을 정하게 한다.

**Architecture:** 달별 선택과 자동 기준을 소유자 전용 테이블 둘에 저장하고, 읽기·쓰기는 정의자 RPC 넷으로만 한다. RPC가 보는 사람(본인·친구·그 외)에 따라 문장을 계산해 달마다 한 줄만 돌려준다. 화면은 한 줄 모양의 표현 부품 하나를 내 일기장(행동 있음)과 친구 서재(읽기 전용)가 함께 쓴다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase(PostgreSQL RLS, RPC), Tailwind 토큰, Headless UI `Sheet`, vitest, PGlite 계약 테스트.

**Spec:** [`docs/superpowers/specs/2026-11-13-monthly-sentence-design.md`](../specs/2026-11-13-monthly-sentence-design.md)

## Global Constraints

- 달은 `entries.date`의 연·월, 문자열은 `YYYY-MM`. "오늘"은 `public.monthly_excerpt_kst_today()`(SQL), `todayKST()`(TS).
- 후보는 `e.quote ~ '[^[:space:]]'`인 기록뿐이다. 범위는 이번 달 포함 최근 24개월.
- "더 최근"은 `e.date desc, e.created_at desc, e.id desc`.
- 친구에게 가는 응답에는 나만 보기 기록에서 나온 값(문장, id, 수, 숨겨졌다는 사실)이 없다.
- 마이그레이션은 추가만 한다. 기존 함수·정책을 바꾸지 않는다.
- 색·글자는 기존 토큰만. 그림자·간지(`.vellum`)·`dark:` 분기·임의 hex를 쓰지 않는다. 문장·달 숫자는 `font-serif`, 메타·행동은 `font-sans`. 아이콘은 `lucide-react`, 선 굵기 1.75.
- 응답 헤더는 `excerptHeaders`(`private, no-store`). 브라우저 호출은 `apiFetch`.
- 로그에 기록 본문을 남기지 않는다(오류 코드만).
- 고정 문구(한 글자도 바꾸지 않는다):
  - 기준: `좋아요 많은 문장` / `생각 많은 문장` / `최근 문장`. 한 줄: `고르지 않은 달은 {기준}으로`
  - 출처: `내가 고른 문장` / `발췌집 표지`
  - 안내: `나만 보여요 · 친구에게는 다른 문장이 보여요` / `나만 보여요 · 친구에게는 이 달이 보이지 않아요`
  - 빈 달: `쉬어 간 달` / `생각만 남긴 달`
  - 행동: `바꾸기` / `자동으로 되돌리기` / `더 보기` / `엮기` / `펼치기` / `이달의 문장으로` / `이달의 문장에서 내리기`
  - 친구 서재 구역: `달마다 한 문장`
  - 실패: `달마다 남긴 문장을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.` / `기준을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.` / `문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.` / `문장을 불러오지 못했어요.` + `다시 시도`
- 커밋 메시지는 한국어 `feat:`/`fix:`/`docs:`/`test:` 한 줄 + `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Review Focus

1. **고른 뒤 기록이 바뀐 경우.** 고른 기록의 날짜를 다른 달로 옮기거나 문장을 지우면, 그 달은 표지·자동 기준으로 돌아가고 옮겨 간 달의 문장이 되지 않는다. → Task 1 계약 테스트 `stale pick`.
2. **나만 보기 기록만 있는 달.** 친구 응답에 그 달의 줄이 없고 문장·id가 어디에도 없다. `nextBefore` 계산도 그 달의 존재를 드러내지 않는다. → Task 1 `private-only month`.
3. **달 경계.** KST로 1일 0시 직후, 지난달은 `unmade`가 되고 이번 달은 아직 엮기 대상이 아니다. 24개월 바닥보다 오래된 달은 본인에게도 나오지 않는다. → Task 1 `month boundary`.
4. **관계가 끊긴 직후.** 친구를 끊었거나 소유자가 탈퇴 유예에 들어가면 `mode: 'none'`이고 줄이 없다. 유예 중인 본인은 선택·기준을 쓰지 못한다. → Task 1 `unfriended`, `pending deletion`.
5. **아주 긴 문장과 쪽수 없는 기록.** 줄 수로 자르지 않으므로 긴 문장이 칸을 밀어내지 않고 줄바꿈된다. 쪽수가 없으면 메타에 쪽수 자리가 비지 않고 책 제목만 나온다. → Task 2 `ownMeta` 테스트, Task 4 부품 테스트 `long quote`.

---

### Task 1: DB — 테이블, RPC, 계약 테스트

**Files:**
- Create: `supabase/migrations/20261113090000_monthly_sentences.sql`
- Create: `supabase/tests/monthly_sentences_contract.sql`
- Create: `supabase/tests/run-monthly-sentences-contract.mjs` (`run-monthly-excerpts-contract.mjs`와 같은 틀, 대상 파일은 `monthly_sentences_contract.sql` 하나)
- Modify: `types/supabase.d.ts` (새 테이블 둘, 함수 넷)
- Modify(필요하면): 테이블·함수를 열거하는 기존 계약(`run-private-tables-rls-contract.mjs`, `run-api-grants-contract.mjs`, `run-migration-chain-contract.mjs`). `npm run test:db`가 알려 준다.

**Interfaces — Produces:**

테이블(둘 다 RLS 켬, `authenticated`에는 본인 행 `select`만, 쓰기 권한 없음, `service_role` 전체):

```sql
public.monthly_sentence_picks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  entry_id uuid not null references public.entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, month)
)  -- + index on (entry_id)
public.monthly_sentence_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rule text not null check (rule in ('likes', 'reflections', 'recent'))
)  -- 행이 없으면 'likes'
```

함수(모두 `security definer set search_path = ''`, `public`·`anon` 회수, `authenticated` 실행 허용. 로그인하지 않았으면 `raise exception 'Authentication required'`):

`get_monthly_sentences(p_owner uuid, p_before text default null, p_limit integer default 6) returns jsonb`

- `p_limit`은 1~24로 자른다. `p_before`는 `YYYY-MM`이고 그 달보다 **앞선** 달부터 돌려준다. 형식이 틀리면 빈 결과.
- 바닥은 `이번 달 - 23개월`.
- `p_owner = auth.uid()` → 본인:

```jsonc
{ "mode": "own", "rule": "likes", "reflectionsOn": true, "nextBefore": "2026-05" /* 더 없으면 null */,
  "rows": [{
    "month": "2026-11", "entryId": "…" /* 후보가 없으면 null */, "quote": "…", "bookTitle": "…",
    "fromPage": 184, "toPage": null, "source": "picked" /* 'picked'|'excerpt'|'auto'|null */,
    "entryCount": 12, "isPrivate": false,
    "friendFallback": null /* source='picked'이고 isPrivate일 때만 'other'|'none' */,
    "excerpt": "none" /* 'made': 엮은 달 / 'unmade': 끝난 달이고 후보가 있고 안 엮음 / 'none' */
  }] }
```

  줄은 달력 달 단위로 최신부터 `p_limit`개. 가장 아래 달은 `greatest(바닥, 내 첫 기록의 달)`. 기록이 하나도 없으면 `rows: []`. 기록이 없는 사이 달도 줄로 나온다(`entryCount: 0`, `entryId: null`).
- `public.is_friend_with(p_owner)` → 친구:

```jsonc
{ "mode": "friend", "hasAnyExcerpt": true, "nextBefore": null,
  "rows": [{ "month": "2026-11", "entryId": "…", "quote": "…", "bookTitle": "…",
             "fromPage": null, "toPage": null, "hasExcerpt": false }] }
```

  줄은 **공개 후보가 하나라도 있는 달**만, 최신부터 `p_limit`개. `hasExcerpt`는 그 달 발췌집이 `is_shared`이고 `monthly_excerpt_visible_items`가 1개 이상. `hasAnyExcerpt`는 범위와 무관하게 그런 권이 하나라도 있는지.
- 그 외: `{ "mode": "none", "rows": [], "nextBefore": null }`.
- 문장 결정(스펙 2.2·2.4). 유효한 선택 = 선택 행의 기록이 소유자 것이고, 후보이며, 기록 날짜의 달이 선택 행의 달과 같다.
  - 본인: 유효한 선택 → 발췌집 첫 항목(순서가 가장 앞선 후보) → 자동.
  - 친구: 유효한 선택이 공개 기록이면 그것 → 공유 중인 발췌집의 `monthly_excerpt_visible_items` 첫 항목 → 공개 후보 안에서 자동.
- 자동 기준 정렬:
  - `likes`: `public.is_account_active(l.user_id)`인 좋아요 수 내림차순, 그다음 "더 최근".
  - `reflections`: 본인 계산은 그 기록의 생각 전부, 친구 계산은 `not r.is_private`인 생각만 센다. 소유자에게 이어 남긴 생각이 꺼져 있으면 `recent`로 계산한다. 소유자 기준의 켜짐 여부는 `feature_rollouts`를 읽는 내부 함수 `monthly_sentence_reflections_on(p_user uuid) returns boolean`(`entry_reflections_enabled()`와 같은 식, 아무에게도 실행 권한 없음)로 판정한다. `reflectionsOn`도 이 값이다.
  - `recent`: "더 최근".

`get_monthly_sentence_candidates(p_month text, p_offset integer default 0, p_limit integer default 30) returns jsonb` — 본인 전용. 달 형식이 틀리면 `raise exception 'invalid_month'`.

```jsonc
{ "pickedEntryId": null, "publicCount": 3, "total": 7,
  "items": [{ "entryId": "…", "quote": "…", "bookTitle": "…", "date": "2026-11-09", "isPrivate": false }] }
```

  `items`는 "더 최근" 순. `pickedEntryId`는 유효한 선택만. `p_limit`은 1~50.

`set_monthly_sentence(p_month text, p_entry_id uuid) returns jsonb` — 첫 줄에서 `perform public.assert_account_active();`. `p_entry_id`가 null이면 그 달의 선택을 지운다. 아니면 내 기록이고, 후보이고, 그 달의 기록인지 확인하고 아니면 `raise exception 'invalid_entry'`. upsert 뒤 그 달의 **본인 줄 하나**(위 own 줄과 같은 모양)를 돌려준다.

`set_monthly_sentence_rule(p_rule text) returns void` — `assert_account_active`, 값이 셋 중 하나가 아니면 `raise exception 'invalid_rule'`, upsert.

- [ ] **Step 1: 계약 테스트를 쓴다** — `monthly_sentences_contract.sql`. `monthly_excerpts_friend_contract.sql`의 `t.as_user`/`t.eq`/`no_trace` 틀과 역할(A 주인, C 친구, D 남, E 신청만)을 따른다. `monthly_excerpt_kst_today()`를 재정의해 오늘을 `2026-11-13`으로 고정한다. 장면마다 `t.eq`로 아래를 확인한다.
  - `default rule`: 설정 행이 없으면 `rule = 'likes'`. 좋아요 2개인 문장이 최근 문장을 이긴다. 좋아요가 0인 달은 가장 최근 문장.
  - `tie`: 좋아요가 같으면 날짜가 늦은 쪽, 날짜도 같으면 `created_at`이 늦은 쪽.
  - `rules`: `reflections`로 바꾸면 생각 3개인 문장, `recent`로 바꾸면 가장 최근 문장. 기준을 바꿔도 `picked`·`excerpt` 달은 그대로.
  - `reflections off`: `feature_rollouts.enabled = false`면 `reflections` 기준이 `recent`와 같은 결과, `reflectionsOn = false`.
  - `pick`: `set_monthly_sentence`가 돌려준 줄이 `source: 'picked'`. null로 부르면 자동으로 돌아간다. 남의 기록·생각만 있는 기록·다른 달의 기록은 `invalid_entry`.
  - `excerpt cover`: 10월 발췌집을 엮으면 10월이 `source: 'excerpt'`이고 첫 항목의 문장. 선택을 하면 `picked`가 이긴다. 선택을 해도 `monthly_excerpt_items`는 그대로.
  - `stale pick`: 고른 기록의 `date`를 9월로 옮기면 11월은 자동으로, 9월은 그 기록을 "고른 문장"으로 삼지 않는다. 고른 기록의 `quote`를 비우면 선택이 무시된다. 기록을 지우면 선택 행도 사라진다.
  - `private pick`: 나만 보기 기록을 고르면 본인 줄이 `isPrivate: true`. 그 달에 공개 후보가 있으면 `friendFallback: 'other'`이고 친구에게는 공개 후보 중 자동 문장이 보인다. 공개 후보가 없으면 `'none'`.
  - `private-only month`: 친구 응답에 그 달의 줄이 없고 `t.no_trace` 통과. 친구 응답 어디에도 `entryCount`, `source`, `rule`, `isPrivate`, `friendFallback` 키가 없다.
  - `friend reflections`: 기준이 `reflections`일 때 비공개 생각 5개인 공개 문장 P와 공개 생각 1개인 공개 문장 Q가 있으면, 본인에게는 P, 친구에게는 Q.
  - `friend excerpt`: 공유하지 않은 발췌집의 달은 친구에게 자동 문장이고 `hasExcerpt: false`. 공유하면 visible 첫 항목이고 `hasExcerpt: true`, `hasAnyExcerpt: true`.
  - `friend paging`: 공개 후보가 있는 달이 8개면 첫 호출은 6줄과 `nextBefore`, 둘째 호출은 2줄과 `null`. 사이에 낀 비공개 전용 달은 줄 수에 들지 않는다.
  - `own paging`: 첫 기록이 2026-03이면 3월 줄에서 끝나고 `nextBefore: null`. 첫 기록이 2024-01이면 바닥 2024-12에서 끝난다.
  - `month boundary`: 오늘을 `2026-12-01`로 바꾸면 11월이 `excerpt: 'unmade'`, 12월 줄은 `'none'`.
  - `unfriended` / `stranger` / `anon`: D와 E는 `mode: 'none'`. 익명은 실행 권한이 없다.
  - `pending deletion`: A가 유예에 들어가면 C는 `mode: 'none'`, A의 `set_monthly_sentence`·`set_monthly_sentence_rule`은 예외. A를 좋아요한 계정이 유예에 들어가면 그 좋아요는 세지 않는다. (유예 상태를 만드는 방법은 `run-account-deletion-contract.mjs`를 따른다.)
  - `direct writes`: `authenticated`로 두 테이블에 직접 insert·update·delete가 거부된다. C가 A의 행을 select하면 0행.

- [ ] **Step 2: 실패를 확인한다**

Run: `node supabase/tests/run-monthly-sentences-contract.mjs`
Expected: `실패: monthly_sentences_contract.sql` (함수 없음)

- [ ] **Step 3: 마이그레이션을 쓴다** — 위 Interfaces 그대로. 문장 계산은 "한 사람·달 범위·보는 방식 → 달마다 기록 하나"를 돌려주는 내부 SQL 함수 하나로 모으고(실행 권한 없음), 공개 RPC 둘과 `set_monthly_sentence`의 반환이 함께 쓴다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npm run test:db`
Expected: 전부 통과(`N/N 통과`). 열거형 계약이 새 테이블·함수 때문에 실패하면 그 목록에 더한다.

- [ ] **Step 5: `types/supabase.d.ts`에 테이블 둘과 함수 넷을 더하고 커밋한다**

```bash
git add supabase types/supabase.d.ts
git commit -m "feat: 달마다 한 문장을 고르고 읽는 DB 계약을 더한다"
```

---

### Task 2: lib — 타입, 표시 모델, 서버 조회

**Files:**
- Create: `lib/monthly-sentence/types.ts`, `lib/monthly-sentence/model.ts`, `lib/monthly-sentence/server.ts`
- Test: `lib/monthly-sentence/__tests__/model.test.ts`, `lib/monthly-sentence/__tests__/server.test.ts`

**Interfaces — Consumes:** Task 1의 RPC. `MonthKey`(`lib/monthly-excerpt/types`), 쪽수 표기는 `lib/entries/pages.ts`의 기존 함수.

**Interfaces — Produces:**

```ts
// types.ts
export type SentenceRule = 'likes' | 'reflections' | 'recent';
export type SentenceSource = 'picked' | 'excerpt' | 'auto';
export interface OwnSentenceRow {
  month: MonthKey; entryId: string | null; quote: string | null; bookTitle: string | null;
  fromPage: number | null; toPage: number | null; source: SentenceSource | null;
  entryCount: number; isPrivate: boolean; friendFallback: 'other' | 'none' | null;
  excerpt: 'none' | 'unmade' | 'made';
}
export interface FriendSentenceRow {
  month: MonthKey; entryId: string; quote: string; bookTitle: string | null;
  fromPage: number | null; toPage: number | null; hasExcerpt: boolean;
}
export interface OwnSentences { mode: 'own'; rule: SentenceRule; reflectionsOn: boolean; rows: OwnSentenceRow[]; nextBefore: MonthKey | null }
export interface FriendSentences { mode: 'friend'; hasAnyExcerpt: boolean; rows: FriendSentenceRow[]; nextBefore: MonthKey | null }
export interface SentenceCandidate { entryId: string; quote: string; bookTitle: string | null; date: string; isPrivate: boolean }
export interface SentenceCandidates { pickedEntryId: string | null; publicCount: number; total: number; items: SentenceCandidate[] }

// model.ts
export const SENTENCE_PAGE_SIZE = 6;
export const RULES: readonly SentenceRule[];                       // ['likes','reflections','recent']
export function ruleLabel(rule: SentenceRule): string;             // 고정 문구
export function ruleSentence(rule: SentenceRule): string;          // `고르지 않은 달은 ${ruleLabel(rule)}으로`
export function availableRules(reflectionsOn: boolean): SentenceRule[]; // 꺼져 있으면 'reflections' 제외
export function shownRule(rule: SentenceRule, reflectionsOn: boolean): SentenceRule; // 꺼져 있고 'reflections'면 'recent'
export function monthNumber(month: MonthKey): string;              // '2026-09' → '9'
export function yearLabels(months: MonthKey[]): (string | null)[]; // 첫 줄과 해가 바뀌는 줄만 '2026'
export function placeholder(row: OwnSentenceRow): string | null;   // 후보 없음: entryCount>0 ? '생각만 남긴 달' : '쉬어 간 달'
export function ownMeta(row: OwnSentenceRow): string[];            // [책 제목, 쪽수?, 출처 문구?, `기록 ${n}`]
export function friendMeta(row: FriendSentenceRow): string[];      // [책 제목, 쪽수?]
export function fallbackNotice(f: 'other' | 'none' | null): string | null; // 고정 문구 둘
export function pickNotice(candidate: Pick<SentenceCandidate, 'isPrivate'>, publicCount: number): string | null;
// 나만 보기 후보를 고를 때의 안내: 다른 공개 후보가 있으면 'other' 문구, 없으면 'none' 문구. 공개 후보면 null.

// server.ts — 실패는 throw(lib/monthly-excerpt/server.ts의 fail 틀)
export async function fetchMySentences(userId: string): Promise<OwnSentences>;
export async function fetchLibrarySentences(ownerId: string): Promise<OwnSentences | FriendSentences>;
// mode가 'none'이면 { mode: 'friend', hasAnyExcerpt: false, rows: [], nextBefore: null }로 돌려준다.
```

- [ ] **Step 1: `model.test.ts`를 쓴다**

```ts
it('yearLabels: 첫 줄과 해가 바뀌는 줄에만 연도', () => {
  expect(yearLabels(['2026-02', '2026-01', '2025-12', '2025-11'])).toEqual(['2026', null, '2025', null]);
});
it('ownMeta: 쪽수가 없으면 자리를 비우지 않는다', () => {
  expect(ownMeta(row({ bookTitle: '애도 일기', fromPage: null, source: 'auto', entryCount: 8 })))
    .toEqual(['애도 일기', '기록 8']);
  expect(ownMeta(row({ bookTitle: '다시, 책으로', fromPage: 184, source: 'picked', entryCount: 12 })))
    .toEqual(['다시, 책으로', '184쪽', '내가 고른 문장', '기록 12']);
  expect(ownMeta(row({ source: 'excerpt' }))).toContain('발췌집 표지');
});
it('placeholder', () => {
  expect(placeholder(row({ entryId: null, entryCount: 0 }))).toBe('쉬어 간 달');
  expect(placeholder(row({ entryId: null, entryCount: 3 }))).toBe('생각만 남긴 달');
  expect(placeholder(row({ entryId: 'e1' }))).toBeNull();
});
it('기준: 생각 기능이 꺼지면 선택지에서 빠지고 최근으로 보인다', () => {
  expect(availableRules(false)).toEqual(['likes', 'recent']);
  expect(shownRule('reflections', false)).toBe('recent');
  expect(ruleSentence('likes')).toBe('고르지 않은 달은 좋아요 많은 문장으로');
});
it('안내 문구', () => {
  expect(fallbackNotice('other')).toBe('나만 보여요 · 친구에게는 다른 문장이 보여요');
  expect(fallbackNotice('none')).toBe('나만 보여요 · 친구에게는 이 달이 보이지 않아요');
  expect(pickNotice({ isPrivate: true }, 0)).toBe(fallbackNotice('none'));
  expect(pickNotice({ isPrivate: true }, 2)).toBe(fallbackNotice('other'));
  expect(pickNotice({ isPrivate: false }, 0)).toBeNull();
});
```

  쪽수 표기(`184쪽`, 범위)는 `lib/entries/pages.ts`의 결과를 그대로 쓰고, 테스트의 기대값을 그 함수의 실제 표기에 맞춘다.

- [ ] **Step 2: `server.test.ts`를 쓴다** — `lib/monthly-excerpt/__tests__/server.test.ts`의 supabase 모킹 틀로: RPC 오류면 throw, `mode: 'none'`이면 빈 friend 결과, 인자는 `{ p_owner, p_limit: 6 }`.

- [ ] **Step 3: 실패 확인** — Run: `npx vitest run lib/monthly-sentence` / Expected: FAIL(모듈 없음)

- [ ] **Step 4: 세 파일을 구현한다.**

- [ ] **Step 5: 통과 확인 후 커밋** — Run: `npx vitest run lib/monthly-sentence` / Expected: PASS

```bash
git add lib/monthly-sentence && git commit -m "feat: 달마다 한 문장의 표시 모델과 서버 조회를 더한다"
```

---

### Task 3: API 라우트

**Files:**
- Create: `app/api/monthly-sentences/route.ts` (GET, PUT)
- Create: `app/api/monthly-sentences/rule/route.ts` (PUT)
- Create: `app/api/monthly-sentences/candidates/route.ts` (GET)
- Test: `app/api/monthly-sentences/__tests__/route.test.ts` (`app/api/monthly-excerpts/__tests__/route.test.ts` 틀)

**Interfaces — Produces:**

| 요청 | 성공 응답 | 4xx |
| --- | --- | --- |
| `GET /api/monthly-sentences?owner=<uuid>&before=YYYY-MM` (`owner` 생략 = 나) | RPC의 jsonb 그대로 | `owner`·`before` 형식 오류 400 |
| `PUT /api/monthly-sentences` `{ month, entryId: string \| null }` | `{ row: OwnSentenceRow }` | 형식 오류 400, `invalid_entry` 400 `고를 수 없는 기록이에요.` |
| `PUT /api/monthly-sentences/rule` `{ rule }` | `{ rule }` | 값 오류 400 |
| `GET /api/monthly-sentences/candidates?month=YYYY-MM&offset=0` | `SentenceCandidates & { hasMore: boolean }` (`hasMore = offset + items.length < total`) | 형식 오류 400 |

모두: 로그인하지 않았으면 `unauthorized(excerptHeaders)`, 그 밖의 RPC 오류는 문구 없이 500, 로그에는 `error.code`만. 유예 중 계정의 쓰기 오류는 기존 쓰기 라우트가 `assert_account_active` 예외를 다루는 방식 그대로(`app/api/monthly-excerpts/route.ts` 참고).

- [ ] **Step 1: 라우트 테스트를 쓴다** — 미인증 401, 잘못된 `month`/`owner`/`rule`/`entryId` 400(RPC를 부르지 않음), `invalid_entry` → 400과 위 문구, 성공 시 RPC 인자와 응답 모양, `hasMore` 계산(`total 31, offset 0, items 30` → true / `offset 30, items 1` → false), 모든 응답에 `Cache-Control: private, no-store, max-age=0`.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run app/api/monthly-sentences` / Expected: FAIL
- [ ] **Step 3: 라우트 셋을 구현한다.**
- [ ] **Step 4: 통과 확인 후 커밋** — `git commit -m "feat: 달의 문장을 읽고 고르는 API를 더한다"`

---

### Task 4: 내 일기장 — 목록, 자동 기준, 고르기 시트

**Files:**
- Create: `components/monthly-sentence/SentenceRows.tsx` — 표현만. 줄 모양(스펙 3.1).
- Create: `components/monthly-sentence/MySentences.tsx` — 내 화면의 상태(기준, 더 보기, 시트 열기).
- Create: `components/monthly-sentence/SentencePickerSheet.tsx`
- Test: `components/monthly-sentence/__tests__/SentenceRows.test.tsx`, `MySentences.test.tsx`, `SentencePickerSheet.test.tsx`
- Modify: `components/profile/MeView.tsx` — `MonthList`·`MonthItems`·`MonthAction`·`ResolvedMonthItems`를 걷어 내고 모바일·데스크톱 두 자리에 `<MySentences />`. 데스크톱 제목 `최근의 차례` 아래 캡션은 `달마다 한 문장`. props `months`·`monthsError`·`excerptMonths`·`todayKst`를 `sentences: OwnSentences | null`로 바꾼다(null = 불러오지 못함).
- Modify: `components/profile/meModel.ts`, `components/profile/__tests__/meModel.test.ts` — `monthRows`, `withExcerptState`, `MonthRow`와 그 테스트를 지운다(다른 곳에서 쓰지 않는지 `grep`으로 확인한 뒤).
- Modify: `app/(app)/profile/(me)/page.tsx` — `fetchMyExcerptMonths` 대신 `fetchMySentences(user.id).catch(() => null)`를 `Promise.all`에 넣는다. `components/profile/ProfileSkeleton.tsx`가 MeView에 주는 props도 맞춘다.

**Interfaces — Produces:**

```tsx
// SentenceRows.tsx
export interface SentenceRowView {
  month: MonthKey; year: string | null;      // yearLabels 결과
  quote: string | null; placeholder: string | null;
  href: string | null;                       // 기록 한 장
  meta: string[]; notice: string | null;
  actions?: React.ReactNode;                 // 바꾸기·엮기·펼치기
}
export default function SentenceRows(props: { rows: SentenceRowView[]; label: string }): JSX.Element; // <ol aria-label={label}>

// MySentences.tsx
export default function MySentences(props: { initial: OwnSentences | null }): JSX.Element;

// SentencePickerSheet.tsx
export default function SentencePickerSheet(props: {
  open: boolean; onClose: () => void;
  month: MonthKey; current: OwnSentenceRow;          // 지금 문장을 맨 위에 보인다
  onPicked: (row: OwnSentenceRow) => void;           // 저장 성공 뒤
}): JSX.Element;
```

**정해 둔 모양:**

- 줄: `grid grid-cols-[52px_minmax(0,1fr)]`, 줄 사이 `border-t border-hairline`. 달 숫자 `font-serif` 26px 굵게, 연도는 그 아래 11px `text-ink-faint`. 본문 칸은 왼쪽에 `border-l border-margin`과 안쪽 여백 14px. 문장 `font-serif text-quote`(없으면 가장 가까운 기존 크기 토큰) `break-words`, 줄 수 제한 없음. 메타는 ` · `로 이어 붙인 `font-sans text-caption text-ink-faint`. 안내는 메타 아래 같은 크기 `text-ink-sub`.
- 문장 영역 전체가 기록 한 장으로 가는 `Link`다. 행동(`바꾸기` 등)은 링크 밖 형제 요소라 링크 안에 버튼이 들어가지 않는다.
- 행동은 메타 줄 오른쪽 끝에 텍스트 버튼(`text-accent`, 최소 터치 높이 44px)으로 둔다. 순서: `엮기`/`펼치기`(있으면) → `바꾸기`. 좁은 폭에서는 메타 아래로 내려간다.
  - `excerpt === 'unmade'` → `엮기`(`/excerpts/{month}/compose`), `'made'` → `펼치기`(`/excerpts/{month}`). 주소는 지금 `MonthAction`이 쓰는 값을 그대로 옮긴다.
  - `entryId`가 있는 줄만 `바꾸기`.
- 자동 기준 한 줄: 목록 위. `ruleSentence(shownRule(...))` 문장을 버튼으로 두고, 누르면 `availableRules`가 `Chip` 묶음(`role="radiogroup"`)으로 펼쳐진다. 고르면 `PUT /rule` → 성공 시 `GET /api/monthly-sentences`로 지금 펼친 만큼 다시 받아 바꾼다. 저장 중에는 칩을 `disabled`. 실패하면 이전 기준으로 되돌리고 `sonner` 토스트로 고정 문구.
- `더 보기`: `nextBefore`가 있을 때만. 누르면 `before=nextBefore`로 다음 여섯 줄을 붙인다. 불러오는 중 `disabled`, 실패하면 버튼 자리에 `문장을 불러오지 못했어요.`와 `다시 시도`.
- `initial === null` → 목록 실패 문구. `rows.length === 0` → 지금의 "첫 문장을 남기면 이 일기장의 첫 장이 생겨요." 빈 상태(기존 마크업을 옮긴다).
- 시트(`components/ui/Sheet`, 제목 `{N}월의 문장`): 열릴 때 `GET /candidates`. 맨 위에 지금 문장(`current`)을 `지금 문장` 라벨과 함께. 그 아래 후보 `role="radiogroup"`, 항목은 문장(두 줄 clamp)·책 제목·`dayLabel(date)`·나만 보기면 `나만 보기` 라벨과 `pickNotice` 문구. 화살표 키로 옮기고 Enter/Space로 고른다. `hasMore`면 `더 보기`. `current.source === 'picked'`일 때만 `자동으로 되돌리기`. 고르면 `PUT` → `onPicked(row)` → 닫힘. 저장 중 중복 입력 막기. 로딩 뼈대, 실패 시 `문장을 불러오지 못했어요.` + `다시 시도`, 저장 실패는 시트를 닫지 않고 토스트.
- `MySentences`는 MeView에서 두 번 그려진다(모바일 장·데스크톱 장). 저장이 끝나면 자기 상태를 바꾼 뒤 `router.refresh()`를 불러 다른 쪽도 새 `initial`을 받게 하고, `initial`이 바뀌면 상태를 그 값으로 다시 맞춘다.

- [ ] **Step 1: `SentenceRows.test.tsx`** — 연도는 `year`가 있는 줄에만, `quote`가 null이면 `placeholder`가 옅게 나오고 링크가 없다, `long quote`: 2,000자 문장이 `line-clamp` 클래스 없이 `break-words`로 그려진다, 행동 버튼이 링크의 자손이 아니다, `<ol>`의 이름이 `label`.
- [ ] **Step 2: `MySentences.test.tsx`** (`apiFetch` 모킹) — null이면 실패 문구, 빈 rows면 빈 상태, 기준 문장이 보이고 칩을 고르면 `PUT /rule` 뒤 목록을 다시 받는다, `PUT` 실패면 이전 기준 문장으로 돌아온다, `reflectionsOn: false`면 `생각 많은 문장` 칩이 없다, `nextBefore`가 null이면 `더 보기`가 없다, `더 보기`를 누르면 `before`가 붙은 요청과 12줄, `friendFallback: 'none'` 줄에 고정 안내 문구, `excerpt: 'unmade'` 줄에 `엮기`.
- [ ] **Step 3: `SentencePickerSheet.test.tsx`** — 닫혀 있으면 요청이 없다, 열면 후보 요청 1회, `지금 문장`이 첫 항목, 나만 보기 후보에 `publicCount`에 맞는 안내, 고르면 `PUT { month, entryId }`와 `onPicked`, `자동으로 되돌리기`는 `picked`일 때만 있고 `entryId: null`을 보낸다, 후보 요청 실패 시 `다시 시도`가 재요청한다.
- [ ] **Step 4: 실패 확인** — Run: `npx vitest run components/monthly-sentence` / Expected: FAIL
- [ ] **Step 5: 부품 셋을 구현하고 MeView·page·meModel·ProfileSkeleton을 고친다.**
- [ ] **Step 6: 통과 확인** — Run: `npm test && npx eslint . && npx tsc --noEmit` / Expected: 모두 통과
- [ ] **Step 7: 커밋** — `git commit -m "feat: 일기장에서 달마다 한 문장을 보고 직접 고른다"`

---

### Task 5: 기록 한 장에서 고르기

**Files:**
- Modify: `lib/entries/fetchEntryDetail.ts` — 내 기록이면 `monthly_sentence_picks`에서 `entry_id`로 한 행을 읽어 `isMonthlySentence: boolean`을 더한다(선택 행의 `month`가 기록 `date`의 달과 같을 때만 true). 조회 실패는 false.
- Modify: `components/entry/EntryDetailContent.tsx` — props `isMonthlySentence`, 메뉴 시트에 한 줄.
- Modify: `app/(app)/entry/[entry_id]/(detail)/page.tsx` — prop 전달.
- Test: `lib/entries/__tests__/`의 fetchEntryDetail 테스트(있으면 거기에, 없으면 새로), `components/entry/__tests__/EntryDetailContent.monthlySentence.test.tsx`

**Interfaces — Consumes:** `PUT /api/monthly-sentences` → `{ row: OwnSentenceRow }`, `fallbackNotice`, `monthNumber`.

- 메뉴 줄: `공유하기` 다음, `원문 고치기` 앞. 아이콘 `Quote`. 내 기록이고 `entry.quote`에 공백 아닌 글자가 있을 때만 그린다.
- 라벨은 `isMonthlySentence ? '이달의 문장에서 내리기' : '이달의 문장으로'`. 누르면 메뉴를 닫고 `PUT`(`month` = `entry.date.slice(0, 7)`, 내릴 때 `entryId: null`).
- 성공 토스트: 올릴 때 `{N}월의 문장으로 골랐어요`, `row.friendFallback`이 있으면 그 안내 문구를 토스트 설명으로 붙인다. 내릴 때 `{N}월의 문장에서 내렸어요`. 실패 토스트는 고정 문구. 성공하면 라벨이 바로 뒤집힌다.

- [ ] **Step 1: 테스트를 쓴다** — 문장 없는 기록·친구 기록에는 줄이 없다, 라벨 두 가지, 누르면 올바른 본문으로 `PUT`, 성공 뒤 라벨이 바뀐다, `friendFallback: 'none'`이면 토스트 설명이 고정 문구, 실패면 라벨 그대로.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run components/entry lib/entries` / Expected: 새 테스트 FAIL
- [ ] **Step 3: 구현한다.**
- [ ] **Step 4: 통과 확인 후 커밋** — `git commit -m "feat: 기록 한 장에서 이달의 문장으로 고른다"`

---

### Task 6: 친구 서재 — 달별 목록을 하나로

**Files:**
- Modify: `app/(app)/social/u/[nicknameAndTag]/(library)/page.tsx` — `fetchFriendRecentExcerpts`/`fetchMyRecentExcerpts` 대신 `fetchLibrarySentences(profile.id).catch(() => null)`.
- Create: `components/monthly-sentence/LibrarySentences.tsx` — 읽기 전용 목록 + `더 보기`.
- Modify: `components/social/library/FriendLibraryView.tsx` — `lib-monthly-excerpts` 구역을 `달마다 한 문장` 구역으로 바꾼다. props `monthlyExcerpts`·`monthlyExcerptsError`를 `sentences: OwnSentences | FriendSentences | null`로 바꾸고 `monthlyExcerptsHref`는 남긴다.
- Modify: `components/social/library/FriendLibrarySkeleton.tsx`, `components/social/library/__tests__/friend-library-monthly.test.ts`
- 정리: 더 쓰이지 않게 된 `fetchFriendRecentExcerpts`·`fetchMyRecentExcerpts`와 그 타입·테스트는 `grep`으로 다른 사용처가 없을 때만 지운다.

**Interfaces — Produces:**

```tsx
export default function LibrarySentences(props: {
  initial: OwnSentences | FriendSentences;
  ownerId: string;
  entryHref: (entryId: string) => string;   // 본인: /entry/{id}, 친구: {base}/entry/{id}
  excerptHref: (month: MonthKey) => string; // 본인: /excerpts/{m}, 친구: {base}/excerpts/{m}
}): JSX.Element;
```

- 줄은 Task 4의 `SentenceRows`. 메타는 `friendMeta`. 본인이 자기 서재를 열었을 때(`mode: 'own'`)도 이 읽기 전용 모양이다: `entryId`가 없는 줄은 빼고, 메타는 책 제목·쪽수만, 안내·`바꾸기`·`엮기` 없음.
- `펼치기`: 친구는 `hasExcerpt`, 본인은 `excerpt === 'made'`인 줄에만.
- 구역 머리의 `모두 보기`(`aria-label="달의 발췌집 모두 보기"`, 지금 마크업 그대로): 친구는 `hasAnyExcerpt`, 본인은 `made`인 줄이 하나라도 있을 때.
- 줄이 하나도 없으면 구역 전체를 그리지 않는다. `sentences === null`이면 구역 머리와 `달마다 남긴 문장을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.`만 그리고 다른 구역은 그대로.
- `더 보기`: `GET /api/monthly-sentences?owner={ownerId}&before={nextBefore}`. 실패 처리는 Task 4와 같다.

- [ ] **Step 1: 테스트를 고쳐 쓴다** — `달마다 엮은 발췌집` 제목이 더는 없다, `달마다 한 문장` 구역에 줄이 그려진다, `hasExcerpt` 줄에만 `펼치기`가 올바른 주소로, `hasAnyExcerpt: false`면 `모두 보기`가 없다, 빈 rows면 구역이 없다, null이면 실패 문구, 친구 화면에 `바꾸기`·`엮기`·`내가 고른 문장`·`기록 ` 메타가 없다, `더 보기` 요청에 `owner`가 붙는다.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run components/social components/monthly-sentence` / Expected: 새 테스트 FAIL
- [ ] **Step 3: 구현한다.**
- [ ] **Step 4: 통과 확인** — Run: `npm test && npx eslint . && npx tsc --noEmit`
- [ ] **Step 5: 커밋** — `git commit -m "feat: 친구 서재에서 달마다 한 문장을 읽고 발췌집을 펼친다"`

---

### Task 7: 문서와 문구

**Files:**
- Modify: `docs/superpowers/specs/2026-10-20-diary-vellum-redesign-design.md` — 4.3 머리에 "2026-11-13: [달마다 한 문장 설계](2026-11-13-monthly-sentence-design.md)가 대체한다. 간지 묶음이 아니다." 한 줄, 3절 표 `me` 줄의 "일기장(달마다 간지)은 4.3 보류"를 "일기장(달마다 한 문장)"으로.
- Modify: `DESIGN.md`, `docs/ui-guidelines.md` — 간지 사용처 목록에서 `달마다 간지` 삭제.
- Modify: `PRODUCT.md` — 프로필 줄에 "달마다 한 문장을 고른다", 친구 서재 설명에 달마다 한 문장.
- Modify: `components/landing/Landing.tsx:195` — `달마다 고른 한 문장이 차례가 되고, 내가 고른 한 문장이 표지가 돼요.` 이 문구를 확인하는 테스트가 있으면 함께.
- Modify: `docs/operations/privacy-release.md` — 친구 서재에 새로 보이는 것(달마다 한 문장: 공개 기록의 문장·책 제목·쪽수), 보이지 않는 것(기록 수, 정해진 방식, 자동 기준, 비공개 선택의 존재), 확인한 계약 테스트 이름, 프로덕션 적용 순서(마이그레이션 먼저, 추가만 하므로 옛 코드와 함께 돌아도 안전).
- Modify: `docs/superpowers/specs/2026-11-13-monthly-sentence-design.md` — 상태를 `승인됨(2026-11-13)`으로, 4절에 실제 테이블·함수 이름을 적는다.

- [ ] **Step 1: 위 파일을 고친다.**
- [ ] **Step 2: 확인** — Run: `npx prettier --check docs DESIGN.md PRODUCT.md && npm test` / Expected: 통과. `grep -rn "달마다 간지" --include='*.md' --include='*.ts*' .`의 결과가 과거 계획 문서(`docs/superpowers/plans/2026-10-22-*`, `docs/design/concept-2026-10/`)와 4.3의 대체 안내뿐이다.
- [ ] **Step 3: 커밋** — `git commit -m "docs: 일기장이 간지 묶음이 아니라 달마다 한 문장임을 문서에 맞춘다"`

---

### Task 8: 실제 화면 확인과 Draft PR

**Files:** 없음(확인에서 나온 수정은 해당 Task의 파일에 한다).

- [ ] **Step 1: 전체 검사** — Run: `npm run test:db && npm test && npx eslint . && npx tsc --noEmit && npm run build` / Expected: 모두 통과.
- [ ] **Step 2: 화면 확인.** 데이터가 필요한 화면이므로 승인된 환경 공급 경로가 있을 때만 `docs/operations/preview-server.md`대로 서버를 띄운다. 없으면 부품 테스트의 합성 fixture로 그린 화면(390px·1280px, 라이트·다크, 키보드)을 확인하고, 실제 데이터·실기기 확인은 **미검증**으로 남긴다. 확인할 장면은 스펙 6절 목록.
- [ ] **Step 3: push와 Draft PR.** 본문은 AGENTS.md의 세 구역(무엇이 달라지나요 / 어떻게 바꾸었나요 / 확인한 내용)으로, 프로덕션 마이그레이션이 아직 적용되지 않았다는 것과 미검증 항목을 적는다.
