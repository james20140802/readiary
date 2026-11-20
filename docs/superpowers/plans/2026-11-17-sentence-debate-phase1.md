# 문장 토론 1차(토론 + 신고·숨기기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 발제자의 친구들이 고정된 문장의 밑줄마다 입장과 함께 답하고, "생각이 바뀌었어요"로 좋은 답이 오르고, 발제자의 정리로 닫히는 토론을 소셜 탭에 낸다. 알림은 2차.

**Architecture:** 토론 전용 테이블 5개(+신고 1개)와 `can_view_debate` 한 함수로 공개 범위를 정한다. 쓰기는 모두 `security definer` RPC(검증·탈퇴 유예 차단·고정 사본을 한 곳에서), 읽기는 집계까지 계산하는 RPC다. Next API 라우트가 RPC를 감싸고, 화면은 `/social/talk` 아래에 둔다. 밑줄 계산은 순수 TS 모듈 하나를 화면과 API가 함께 쓴다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Postgres/RLS, PGlite 계약 테스트, Vitest(+jsdom, @testing-library/react), Tailwind 토큰, framer-motion(`lib/motion.ts`), lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-17-sentence-debate-design.md` (시안: `docs/design/sentence-debate-2026-11/`)

## Global Constraints

- 공개 범위: 토론과 그 안의 모든 것은 **발제자 본인 + `is_friend_with(발제자)`** 만 읽는다. anon은 어떤 권한도 받지 않는다.
- 보는 사람은 RPC 인자가 아니라 `auth.uid()`로만 정한다. 쓰기 RPC는 처음에 `public.assert_account_active()`를 부른다.
- 밑줄: 발제자만, 0~3개, 겹침 없음, 고정 문장 범위 안, 올린 뒤 수정 불가. 위치는 **코드 포인트 인덱스, 끝 포함(inclusive)**.
- 입장 값: `agree`(공감) / `differ`(다르게 읽음) / `question`(질문). 답에는 필수, 답글에는 없음.
- 답글은 1단(답글의 답글 금지). "생각이 바뀌었어요"는 답에만, 자기 답 금지, 사람당 답 하나에 한 번.
- 정리된 토론: 새 답·답글·수정 금지, 삭제와 "생각이 바뀌었어요"는 허용. 정리가 짚는 답 최대 2개.
- 근거 기록: 본인 기록·문장 있는 기록만, 나만 보기 기록 허용, 고정 사본에 **문장·책 제목·저자·쪽수만**(생각 note 제외).
- 친구 아닌 사람: 닉네임·프로필 이미지만, 서재 링크 없음. 응답에 `is_friend` 플래그로 구분.
- 답 쓰기: 768px 미만 `Sheet`, 이상은 단락 안 인라인. 768px 이상에서 `Sheet`를 쓰지 않는다.
- 사용자 문구(정확히): "발제하기", "이 문장으로 토론 열기", "이 문장의 토론 보기", "이 밑줄에 답하기", "문장 전체에 답하기", "생각이 바뀌었어요", "정리하기", "남기기", "공감", "다르게 읽음", "질문", "함께 볼 곳에 밑줄을 그어요", "손을 떼면 취소돼요", "밑줄은 3개까지예요. 하나를 지우고 그어요", "되돌리기", "밑줄 지우기", "이 문장은 기록과 따로 토론에 남아요", "이 문장은 토론에 함께 남아요", "지운 답이에요", "숨긴 답이에요", "떠난 사람의 답이에요", "아직 답이 없어요", "생각을 가장 많이 바꾼 답", "다르게 본 쪽에서", "나머지 N개 보기".
- 디자인: 토큰만(임의 hex·원색 팔레트 금지), 문장·답·질문·정리는 `font-serif`, 조작·메타는 `font-sans`, 깊이(그림자·결)는 **정리 간지에만**, 다크는 토큰 전환(`dark:` 분기 금지), 아이콘 lucide 1.75.
- 응답 헤더 `Cache-Control: private, no-store, max-age=0`. 화면 데이터 접근은 상한 있는 페이지로(닫힌 선택창을 위해 전체를 미리 가져오지 않는다).
- 스키마 변경은 같은 PR에서 `supabase/tests/fixtures/prod-public-schema.json`(+`_captured` 사유)·`types/supabase.d.ts`·`docs/operations/supabase-api-grants.md`를 갱신한다.

## Review Focus

1. **서로 친구가 아닌 두 친구(A·B)와 친구 아닌 C** — C는 토론·답·밑줄·집계 어디서도 0건, B는 A의 답을 보되 `is_friend=false`로 서재 링크 없음. (Task 1·4 계약 테스트)
2. **이모지·서로게이트가 섞인 문장의 밑줄** — 화면에서 그은 글자와 DB가 검증·저장한 글자가 같다. (Task 5 단위 테스트 + Task 1 계약: `'🙂 가나'` 같은 문장)
3. **탈퇴 유예 중인 답 작성자/발제자** — 발제자가 유예면 토론이 안 보이고, 답 작성자가 유예면 본문 대신 "떠난 사람의 답이에요"이며 집계·대표 답에서 빠진다. (Task 4 계약)
4. **정리 뒤의 동작** — 새 답·답글·수정은 거부, 삭제·생각이 바뀌었어요는 허용, 짚은 답이 지워지면 정리 응답에 `deleted:true`. (Task 3 계약)
5. **원래 기록을 비공개로 돌리거나 지운 뒤** — 비공개면 토론은 남고 원래 기록 링크(`source_entry_id`)는 볼 권한이 없을 때 null, 지우면 토론이 사라진다. (Task 1·4 계약)

---

### Task 1: DB — 토론·밑줄·볼 수 있는가·발제 RPC

**Files:**
- Create: `supabase/migrations/20261117090000_debates.sql`
- Create: `supabase/tests/debates_core_contract.sql`, `supabase/tests/run-debates-contract.mjs` (패턴: `run-monthly-excerpts-contract.mjs`, 대상 `debates_*_contract.sql`)
- Modify: `supabase/tests/fixtures/prod-public-schema.json`, `types/supabase.d.ts`, `docs/operations/supabase-api-grants.md`

**Interfaces:**
- Produces 테이블: `debates(id uuid pk, user_id uuid → profiles cascade, source_entry_id uuid null → entries on delete cascade, quote text not null, book_title text not null, book_author text null, page_from int null, page_to int null, question text not null, summary text null, summary_answer_ids uuid[] not null default '{}', closed_at timestamptz null, created_at, updated_at)`; `debate_underlines(debate_id → debates cascade, position smallint 1..3, start_at int, end_at int, pk(debate_id, position))`.
- Produces 함수: `can_view_debate(p_id uuid) returns boolean` (definer, stable; 소유자이거나 `is_friend_with(owner)`, 소유자 `is_account_active`), `create_debate(p_entry_id uuid, p_question text, p_underlines jsonb) returns uuid` (`p_underlines` = `[{"start":int,"end":int}, ...]`), `update_debate_question(p_id uuid, p_question text) returns void`, `delete_debate(p_id uuid) returns void`, `count_entry_debates(p_entry_id uuid) returns int`(본인 기록만).
- 예외 이름(`raise exception '<name>'`): `not_found`, `no_quote`, `invalid_underlines`, `invalid_question`.

- [ ] **Step 1: 계약 SQL을 쓴다** — 역할: A(발제자), B·F(A의 친구, 서로 친구 아님), C(친구 아님), P(A의 친구, 탈퇴 유예). 단언:
  - A가 `create_debate(quote 있는 본인 기록, '질문', '[{"start":0,"end":1},{"start":4,"end":5}]')` → 토론 1, 밑줄 2, `quote`·`book_title`·쪽수가 기록과 같다.
  - 남의 기록·note만 있는 기록 → `not_found`/`no_quote`. 밑줄 4개·겹침·범위 밖·`start>end` → `invalid_underlines`. 빈 질문·500자 초과 → `invalid_question`.
  - 문장 `'🙂 가나다'`에서 `{"start":2,"end":3}` 저장 후 `substr(quote, start+1, end-start+1)` = `'가나'`(코드 포인트 기준).
  - `can_view_debate`: A·B·F 참, C 거짓, anon 거짓; P가 A의 친구여도 P 본인 호출은 유예라 쓰기 RPC 거부.
  - 테이블 직접 `insert/update/delete`는 authenticated에서 `42501`(권한 없음). select는 RLS로 B 1행, C 0행.
  - 원래 기록 `update entries set quote=…` 뒤에도 토론 `quote` 불변. 원래 기록 delete → 토론·밑줄 0행. `count_entry_debates`는 A 본인 기록에서 1, 남의 기록 0.
  - `update_debate_question`은 A만, `delete_debate`는 A만(B는 `not_found`).
- [ ] **Step 2: 실행해 실패 확인** — `node supabase/tests/run-debates-contract.mjs` → FAIL(`function create_debate does not exist`).
- [ ] **Step 3: 마이그레이션 작성** — 위 테이블, RLS enable, `revoke all … from public, anon, authenticated`, `grant select … to authenticated`, `grant all … to service_role`, select 정책 `using (public.can_view_debate(debate_id|id))`. RPC는 `security definer set search_path = ''`, `execute`를 authenticated에만. `create_debate`는 `char_length` 기준으로 밑줄 검증하고 한 트랜잭션에서 밑줄까지 넣는다. 질문 상한 500자. 인덱스: `debates(user_id, created_at desc)`, `debates(source_entry_id)`.
- [ ] **Step 4: 통과 확인** — `node supabase/tests/run-debates-contract.mjs` → `통과: debates_core_contract.sql`; `node supabase/tests/run-migration-chain-contract.mjs` → 통과(fixture 갱신 후); `npm run test:db` 전체 통과.
- [ ] **Step 5: Commit** — `feat: 문장을 고정해 발제하고 친구만 읽는 토론 DB를 더한다`

### Task 2: DB — 답·답글·생각이 바뀌었어요

**Files:**
- Modify: `supabase/migrations/20261117090000_debates.sql` (같은 파일에 이어 쓴다 — 아직 프로덕션 미적용)
- Create: `supabase/tests/debates_answers_contract.sql`
- Modify: fixture, `types/supabase.d.ts`

**Interfaces:**
- Consumes: `debates`, `can_view_debate` (Task 1).
- Produces 테이블: `debate_answers(id uuid pk, debate_id → debates cascade, user_id → profiles cascade, underline_position smallint null, stance text null check in ('agree','differ','question'), body text null, parent_id uuid null, evidence_quote text null, evidence_book_title text null, evidence_book_author text null, evidence_page_from int null, evidence_page_to int null, evidence_entry_id uuid null → entries on delete set null, hidden_at timestamptz null, deleted_at timestamptz null, edited_at timestamptz null, created_at)`, 제약: `(parent_id is null) = (stance is not null)`, 부모와 같은 토론 FK `(parent_id, debate_id)`, 밑줄 FK `(debate_id, underline_position) → debate_underlines`. `debate_moves(answer_id → debate_answers cascade, user_id → profiles cascade, created_at, pk(answer_id,user_id))`.
- Produces 함수: `add_debate_answer(p_debate_id uuid, p_underline smallint, p_stance text, p_body text, p_evidence_entry_id uuid) returns uuid`, `add_debate_reply(p_answer_id uuid, p_body text) returns uuid`, `edit_debate_answer(p_id uuid, p_stance text, p_body text) returns void`(답글은 `p_stance` null), `delete_debate_answer(p_id uuid) returns void`, `set_debate_move(p_answer_id uuid, p_on boolean) returns int`(누른 뒤 그 답의 수).
- 예외 이름: `not_found`, `closed`, `invalid_body`(빈 값·2000자 초과), `invalid_stance`, `invalid_underline`, `nested_reply`, `own_answer`, `invalid_evidence`.

- [ ] **Step 1: 계약 SQL** — 단언:
  - B가 밑줄 1에 `differ` 답 → 행 1; C는 `not_found`; `p_underline=null`이면 문장 전체; 없는 밑줄 번호 → `invalid_underline`; 입장 null → `invalid_stance`.
  - F가 B의 답에 답글 → 성공, 답글에 답글 → `nested_reply`. 답글 행은 `stance is null`.
  - 근거: B의 **비공개** 기록을 붙이면 `evidence_quote`=그 문장, note는 어디에도 복사되지 않음(`debate_answers`의 모든 text 열에 note 문자열 없음); 남의 기록·문장 없는 기록 → `invalid_evidence`.
  - `set_debate_move`: F가 B의 답에 on → 1, 같은 호출 반복 → 1(멱등), off → 0; B가 자기 답 → `own_answer`; 답글에 → `not_found`.
  - 수정: 본인만, `edited_at` 채워짐. 삭제: 답글 없는 답은 행 삭제, 답글 있는 답은 `deleted_at` 설정·`body` null·`evidence_*` null.
  - 테이블 직접 쓰기는 `42501`. select 정책: 볼 수 있는 토론의 답만(숨김은 Task 3).
- [ ] **Step 2: 실패 확인** — `node supabase/tests/run-debates-contract.mjs supabase/tests/debates_answers_contract.sql` → FAIL.
- [ ] **Step 3: 구현** — 모든 쓰기 RPC는 `assert_account_active()` → `can_view_debate` → 닫힘 검사(`closed_at is not null`이면 add/edit는 `closed`, delete·move는 통과). 인덱스: `debate_answers(debate_id, underline_position, created_at)`, `debate_answers(parent_id)`, `debate_moves(answer_id)`.
- [ ] **Step 4: 통과 확인** — 같은 명령 + `npm run test:db`.
- [ ] **Step 5: Commit** — `feat: 밑줄에 입장과 함께 답하고 생각이 바뀌었다고 알리는 DB를 더한다`

### Task 3: DB — 정리·숨기기·신고

**Files:**
- Modify: `supabase/migrations/20261117090000_debates.sql`
- Create: `supabase/tests/debates_moderation_contract.sql`
- Modify: fixture, `types/supabase.d.ts`

**Interfaces:**
- Consumes: Task 1·2.
- Produces 테이블: `debate_reports(id uuid pk, reporter_id → profiles cascade, debate_id → debates cascade, answer_id uuid null → debate_answers cascade, reason text check in ('abuse','spam','privacy','other'), memo text null, created_at, unique(reporter_id, debate_id, answer_id) nulls not distinct)`. authenticated에 select 권한 없음.
- Produces 함수: `set_debate_summary(p_id uuid, p_summary text, p_answer_ids uuid[]) returns void`(정리·수정 겸용, `closed_at`이 null이면 now()), `clear_debate_summary(p_id uuid) returns void`(다시 열기), `set_debate_answer_hidden(p_answer_id uuid, p_hidden boolean) returns void`(발제자만), `report_debate(p_debate_id uuid, p_answer_id uuid, p_reason text, p_memo text) returns void`.
- 예외 이름: `not_found`, `invalid_summary`(빈 값·2000자 초과), `invalid_pins`(3개 이상·다른 토론의 답·답글), `invalid_reason`, `already_reported`.
- select 정책 갱신: `debate_answers`는 `can_view_debate(debate_id) and (hidden_at is null or user_id = auth.uid() or <발제자> = auth.uid())`.

- [ ] **Step 1: 계약 SQL** — 단언:
  - A가 정리(짚기 2개) → `closed_at` 설정; B의 새 답·답글·수정 → `closed`; B의 삭제·F의 move → 성공; 짚기 3개·답글 짚기 → `invalid_pins`; B가 정리 → `not_found`; `clear_debate_summary` 뒤 B의 수정 성공.
  - A가 B의 답 숨김 → F의 select 0행, B·A는 1행; 해제 → F 1행. B가 숨김 시도 → `not_found`.
  - F가 B의 답 신고 → 성공, 같은 신고 → `already_reported`, 토론 자체 신고(`p_answer_id` null) 성공; C는 `not_found`; authenticated의 `select from debate_reports` → `42501`; 잘못된 사유 → `invalid_reason`.
- [ ] **Step 2: 실패 확인** — `node supabase/tests/run-debates-contract.mjs supabase/tests/debates_moderation_contract.sql` → FAIL.
- [ ] **Step 3: 구현** — 위 함수와 정책 교체.
- [ ] **Step 4: 통과 확인** — 같은 명령 + `npm run test:db`.
- [ ] **Step 5: Commit** — `feat: 발제자가 정리해 닫고 답을 숨기며 누구나 신고하는 DB를 더한다`

### Task 4: DB — 읽기 RPC(토론 한 편·단락 페이지·목록)

**Files:**
- Modify: `supabase/migrations/20261117090000_debates.sql`
- Create: `supabase/tests/debates_read_contract.sql`
- Modify: fixture, `types/supabase.d.ts`, `docs/operations/supabase-api-grants.md`(새 테이블·함수 표)

**Interfaces:**
- Consumes: Task 1~3.
- Produces `get_debate(p_id uuid) returns jsonb` (없거나 못 보면 `not_found` 예외). 모양:
  ```json
  { "id", "owner": {"id","nickname","profile_image","is_friend","is_me"}, "quote", "book_title", "book_author", "page_from", "page_to",
    "source_entry_id": "<볼 권한 있을 때만, 아니면 null>", "question", "created_at", "closed_at",
    "summary": null | {"body", "pins": [{"answer_id","nickname","first_line","deleted"}]},
    "totals": {"agree","differ","question","moved_people"},
    "sections": [ {"position": 1|2|3|null, "start", "end", "count", "agree", "differ", "question",
                   "picks": [<answer>, <answer>?], "pick_kinds": ["most_moved"|"plain", "other_side"|"plain"] } ],
    "my_draftable": true|false }
  ```
  `<answer>` = `{"id","author":{"id","nickname","profile_image","is_friend","is_me","active"},"stance","body","evidence":null|{"quote","book_title","book_author","page_from","page_to","entry_id"},"moved_count","moved_by_me","reply_count","replies":[<reply 최대 2>],"hidden","deleted","edited","reported_by_me","created_at"}`. 섹션 순서: 밑줄 position 오름차순, 마지막 `position:null`(문장 전체). 숨김·유예 작성자·삭제된 답은 count·분포·picks에서 제외(유예 작성자 답은 `active:false`, `body:null`로만 나머지 목록에 나타남). `evidence.entry_id`·`source_entry_id`는 열람 권한이 있을 때만.
- Produces `get_debate_answers(p_id uuid, p_position smallint, p_all_sentence boolean, p_after int, p_limit int) returns jsonb` → `{"answers":[<answer>], "next": int|null}`; 정렬 `moved_count desc, created_at asc, id`; picks도 포함한 전체 목록(화면이 picks를 제외해 그린다).
- Produces `get_debate_movers(p_answer_id uuid) returns jsonb` → `[{"nickname","profile_image","is_friend"}]`, **답 쓴 사람만**(다른 사람은 `not_found`).
- Produces `get_debate_replies(p_answer_id uuid) returns jsonb` → `[<reply>]`(`<reply>` = `<answer>`에서 stance·evidence·moved 없음).
- Produces `list_debates(p_closed boolean, p_before timestamptz, p_limit int) returns jsonb` → `{"items":[{"id","owner","quote","underlines":[{"start","end"}],"question","totals","answer_count","top_line":null|{"nickname","body","kind":"most_moved"|"newest"},"summary_first_line","closed_at","last_activity_at"}],"next_before":timestamptz|null}`; 대상은 내 토론 + 친구 토론, 진행 중은 `last_activity_at desc`, 정리됨은 `closed_at desc`.
- 대표 답 규칙(정확히): 1번 = 보이는 답 중 `moved_count desc, created_at asc`의 첫째, `moved_count>0`이면 `most_moved` 아니면 `plain`. 2번 = 1번과 `stance`가 다른 답 중 같은 정렬의 첫째(`other_side`), 없으면 1번 다음(`plain`).

- [ ] **Step 1: 계약 SQL** — 단언:
  - C의 `get_debate` → `not_found`; B의 응답에서 F의 `author.is_friend=false`, A는 `is_friend=true`.
  - 밑줄 1에 `differ`(move 3) / `agree`(move 1) / `differ`(move 0) → picks = [move3 differ `most_moved`, agree `other_side`], count 3, 분포 1/2/0. 모두 같은 입장이면 2번 `plain`. 아무도 안 눌렀으면 1번 `plain`.
  - 숨긴 답: F에게 count 제외, B(작성자)에게는 `get_debate_answers`에 `hidden:true`로 나옴.
  - P(유예)의 답: B에게 `active:false`, `body:null`, 집계 제외.
  - `totals.moved_people`은 서로 다른 사람 수(같은 사람이 두 답에 눌러도 1).
  - 원래 기록을 비공개로: B의 `source_entry_id` null, A는 값.
  - `get_debate_movers`: 답 쓴 B는 목록을 받고 F·A는 `not_found`.
  - `get_debate_answers` 페이지: limit 2로 3개 → `next` 2, 다음 페이지 1개 `next` null.
  - `list_debates(false, null, 10)`: B는 A의 진행 중 토론을 보고 C는 0. 정리 후 `list_debates(true, …)`에 나오고 `summary_first_line` 채워짐.
- [ ] **Step 2: 실패 확인** — `node supabase/tests/run-debates-contract.mjs supabase/tests/debates_read_contract.sql` → FAIL.
- [ ] **Step 3: 구현** — `security definer stable`, 보는 사람은 `auth.uid()`. 한 쿼리로 섹션 집계(답 본문은 picks·replies 2개만). `p_limit`은 1~30으로 자른다.
- [ ] **Step 4: 통과 확인** — 같은 명령, `node supabase/tests/run-migration-chain-contract.mjs`, `node supabase/tests/run-api-grants-contract.mjs`, `npm run test:db`.
- [ ] **Step 5: Commit** — `feat: 토론을 밑줄별 단락과 대표 답으로 한 번에 읽는 RPC를 더한다`

### Task 5: 밑줄 계산과 도메인 타입 (순수 TS)

**Files:**
- Create: `lib/debate/types.ts`, `lib/debate/underline.ts`, `lib/debate/__tests__/underline.test.ts`

**Interfaces:**
- Produces 타입(`types.ts`): `Stance = 'agree'|'differ'|'question'`, `STANCE_LABEL: Record<Stance,string>`(공감/다르게 읽음/질문), `Range = { start: number; end: number }`(코드 포인트, 끝 포함), `DebatePerson`, `DebateAnswer`, `DebateReply`, `DebateSection`, `DebateDetail`, `DebateListItem` — Task 4 JSON과 같은 이름을 camelCase로.
- Produces(`underline.ts`): `toChars(text: string): string[]`(코드 포인트 배열), `trimRange(chars: string[], r: Range): Range | null`(앞뒤 공백·`.,!?·…'"“”‘’()` 제거), `wordAt(chars: string[], i: number): Range | null`, `planStroke(ranges: Range[], stroke: Range, max = 3): { ok: true; ranges: Range[]; merged: number } | { ok: false; reason: 'limit' }`(걸치거나 품은 밑줄을 합쳐 정렬된 새 배열, 합친 개수), `isValidUnderlines(chars: string[], ranges: Range[]): boolean`(0~3, 범위 안, 겹침 없음, `start<=end`), `MAX_UNDERLINES = 3`.

- [ ] **Step 1: 실패 테스트** — `underline.test.ts`:
  - `toChars('🙂 가나')` 길이 4.
  - `trimRange(toChars('경계와 문턱이 '), {start:3,end:8})` → `{start:4,end:6}`.
  - `wordAt(toChars('타자에 대한 환상도.'), 8)` → `{start:7,end:9}`(마침표 제외).
  - `planStroke([{0,2},{4,6},{17,20}], {start:0,end:6})` → ok, `ranges` `[{0,6},{17,20}]`, `merged` 2.
  - 3개 있을 때 겹치지 않는 4번째 → `{ok:false, reason:'limit'}`; 3개 있을 때 하나를 품는 획 → ok, 3개 유지.
  - `isValidUnderlines`: 겹침·4개·범위 밖 false.
- [ ] **Step 2: 실패 확인** — `npx vitest run lib/debate` → FAIL.
- [ ] **Step 3: 구현.**
- [ ] **Step 4: 통과 확인** — `npx vitest run lib/debate` → PASS.
- [ ] **Step 5: Commit** — `feat: 밑줄을 다듬고 합치는 규칙을 한 곳에 둔다`

### Task 6: API 라우트

**Files:**
- Create: `lib/debate/errors.ts`(`debateHeaders`, `rpcFailure(error, fallback)` — 예외 이름 → 4xx 문구, 나머지 500; 패턴 `lib/monthly-excerpt/errors.ts`), `lib/debate/client.ts`(브라우저 `apiFetch` 래퍼들)
- Create: `app/api/debates/route.ts`(GET 목록 `?closed=0|1&before=`, POST 발제), `app/api/debates/[id]/route.ts`(GET, PATCH 질문, DELETE), `app/api/debates/[id]/answers/route.ts`(GET `?position=&whole=1&after=`, POST 답), `app/api/debates/[id]/summary/route.ts`(PUT, DELETE), `app/api/debates/[id]/report/route.ts`(POST), `app/api/debate-answers/[answerId]/route.ts`(PATCH, DELETE), `app/api/debate-answers/[answerId]/replies/route.ts`(GET, POST), `app/api/debate-answers/[answerId]/move/route.ts`(PUT `{on}`), `app/api/debate-answers/[answerId]/hidden/route.ts`(PUT `{hidden}`), `app/api/debate-answers/[answerId]/movers/route.ts`(GET), `app/api/entries/[entry_id]/debates/route.ts`(GET `{count}`)
- Test: `app/api/debates/__tests__/route.test.ts`, `app/api/debate-answers/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 1~4 RPC 이름과 예외 이름, Task 5 `isValidUnderlines`·`Stance`.
- Produces(`lib/debate/client.ts`): `createDebate({entryId, question, underlines}): Promise<{id}>`, `fetchDebate(id)`, `fetchSectionAnswers(id, position|null, after)`, `postAnswer(id, {underline, stance, body, evidenceEntryId})`, `postReply(answerId, body)`, `editAnswer(answerId, {stance?, body})`, `deleteAnswer(answerId)`, `setMove(answerId, on)`, `setHidden(answerId, hidden)`, `saveSummary(id, {body, pins})`, `clearSummary(id)`, `report(id, {answerId, reason, memo})`, `fetchDebateList({closed, before})`, `fetchEntryDebateCount(entryId)`, `fetchMovers(answerId)`, `fetchReplies(answerId)`.
- 상태 코드: 미로그인 401(`unauthorized(debateHeaders)`, `code:"session_expired"` 계약 유지), 잘못된 id·본문 400, `not_found` 404, `closed`/`already_reported`/`own_answer` 409, 나머지 검증 예외 422.

- [ ] **Step 1: 실패 테스트** — 기존 `app/api/monthly-excerpts/__tests__/route.test.ts`의 supabase 모킹 방식으로: POST `/api/debates`가 `create_debate`를 `{p_entry_id, p_question, p_underlines}`로 부르고 201 `{id}`; 밑줄 4개면 RPC를 부르지 않고 400; RPC `closed` → 409 `{code:'closed'}`; 미로그인 401; GET 응답 헤더에 `no-store`; PUT move가 `set_debate_move`를 `{p_answer_id, p_on:true}`로.
- [ ] **Step 2: 실패 확인** — `npx vitest run app/api/debates app/api/debate-answers` → FAIL.
- [ ] **Step 3: 구현.** 본문 길이 상한(질문 500, 답·답글·정리 2000, 신고 메모 500)은 API에서도 먼저 자른다. 로그에는 오류 코드만.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS, `npx tsc --noEmit -p .` 무오류.
- [ ] **Step 5: Commit** — `feat: 토론을 열고 답하고 정리하는 API를 더한다`

### Task 7: 펜처럼 긋는 밑줄 부품

**Files:**
- Create: `components/debate/UnderlinePen.tsx`, `components/debate/UnderlinePen.module.css`, `components/debate/__tests__/underline-pen.test.ts`

**Interfaces:**
- Consumes: Task 5 `toChars`, `trimRange`, `wordAt`, `planStroke`, `MAX_UNDERLINES`.
- Produces: `UnderlinePen({ quote: string; value: Range[]; onChange(next: Range[]): void })` — 문장(부리, `text-quote` 계열), 밑줄 개수 표시(눈금 3 + "밑줄 N/3"), "되돌리기", 밑줄 목록(번호·구간·"지우기"), 안내 줄(`aria-live`), 떠 있는 [주 행동 | 취소] 버튼. 되돌리기 이력은 부품 안 상태.
- 동작(시안 `docs/design/sentence-debate-2026-11/underline-draw.html` C와 같게): 글자마다 `<span data-i>`, `pointerdown/move/up` + `setPointerCapture`, 첫 포인터 외 무시, 문장 밖 28px 넘으면 점선 미리보기 + "손을 떼면 취소돼요", 떼면 취소; 움직임 없는 탭은 그은 밑줄 위면 선택([밑줄 지우기 | 취소]), 아니면 `wordAt`; Esc 취소; 문장 위 `touch-action:none`; 대체 경로로 텍스트 선택(`selectionchange`) → [밑줄 긋기 | 취소].

- [ ] **Step 1: 실패 테스트**(jsdom, `createElement`; `elementFromPoint`를 data-i 반환으로 스텁):
  - 4→6 글자 pointer 이동 후 up → `onChange([{start:4,end:6}])`.
  - 밖으로 300px 이동 후 up → `onChange` 호출 안 됨, 안내 "손을 떼면 취소돼요"가 보였다가 원래 안내로.
  - 기존 `[{4,6}]`에서 0→6 획 → `onChange([{0,6}])`(합침).
  - 3개일 때 겹치지 않는 탭 → `onChange` 없음, "밑줄은 3개까지예요. 하나를 지우고 그어요".
  - 그은 밑줄 탭 → "밑줄 지우기" 버튼 → `onChange([])`; "되돌리기" → `onChange([{4,6}])`.
- [ ] **Step 2: 실패 확인** — `npx vitest run components/debate` → FAIL.
- [ ] **Step 3: 구현.** 미리보기는 accent 10~14% 배경, 겹쳐 막힘 표시 없음(합치므로), 움직임은 `prefers-reduced-motion`에서 색만.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS.
- [ ] **Step 5: Commit** — `feat: 문장 위를 펜처럼 그어 밑줄을 치고 거두는 부품을 더한다`

### Task 8: 발제 3단계와 기록 상세의 진입점

**Files:**
- Create: `app/(app)/social/talk/new/page.tsx`, `components/debate/NewDebateFlow.tsx`, `components/debate/EntryPicker.tsx`
- Create: `app/api/debates/entries/route.ts`(GET `?q=&after=` — 내 기록 중 quote 있는 것, 20개 페이지; 기존 `search_library` RPC를 쓸 수 있으면 쓰고 아니면 `entries` 조회)
- Modify: `components/entry/EntryDetailContent.tsx`(메뉴에 "이 문장으로 토론 열기" → `/social/talk/new?entry=<id>`, 그 기록의 토론이 있으면 "이 문장의 토론 보기"; quote 없으면 숨김. 삭제 확인창에 토론이 있으면 "이 기록으로 연 토론 N개도 함께 사라져요")
- Test: `components/debate/__tests__/new-debate-flow.test.ts`

**Interfaces:**
- Consumes: Task 6 `createDebate`, `fetchEntryDebateCount`; Task 7 `UnderlinePen`.
- Produces: 주소 `/social/talk/new` (`?entry=` 있으면 1단계 건너뜀), 성공 시 `router.replace('/social/talk/<id>')`.
- 단계 머리: "발제 1/3 · 기록 고르기", "2/3 · 함께 볼 곳에 밑줄을 그어요"(밑줄 0개여도 "다음"), "3/3 · 질문 쓰기" + "이 문장은 기록과 따로 토론에 남아요"(기록이 비공개면 이 줄을 강조) + "올리기". 올린 뒤 밑줄을 고칠 수 없음을 3단계에서 한 줄로 알린다("올린 뒤에는 밑줄을 고칠 수 없어요").

- [ ] **Step 1: 실패 테스트** — `?entry`로 시작하면 2단계부터; 질문이 비면 "올리기" disabled; 올리기가 `createDebate({entryId, question, underlines})`를 그린 밑줄로 부른다; 실패 응답이면 입력이 남고 오류 문구가 `role=alert`로.
- [ ] **Step 2: 실패 확인** — `npx vitest run components/debate/__tests__/new-debate-flow.test.ts` → FAIL.
- [ ] **Step 3: 구현.** 단계 이동 중 입력 보존. 기록 고르기는 검색어 입력 + 더 보기 페이지(로딩·실패·다시 시도 따로).
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS.
- [ ] **Step 5: Commit** — `feat: 내 기록 하나로 밑줄과 질문을 붙여 토론을 연다`

### Task 9: 토론 화면

**Files:**
- Create: `app/(app)/social/talk/[id]/page.tsx`(+`loading.tsx`, `not-found.tsx`), `components/debate/DebateView.tsx`(문장·질문·집계·sticky 줄·정리 간지), `components/debate/DebateSection.tsx`(머리줄 토글·분포 띠·picks·나머지 보기), `components/debate/AnswerItem.tsx`(답·답글·생각이 바뀌었어요·더보기 메뉴: 고치기/지우기/숨기기/신고), `components/debate/AnswerComposer.tsx`(입장·입력·근거 붙이기 = 하나의 부품), `components/debate/ComposerHost.tsx`(768px 미만 `Sheet`, 이상 인라인), `components/debate/SummaryEditor.tsx`, `components/debate/ReportSheet.tsx`, `lib/debate/draft.ts`(`localStorage` 키 `debate-draft:<debateId>:<position|whole|reply:<answerId>>`)
- Modify: `lib/shell/routes.ts`(`/social/talk/[id]`를 `MARGIN_PLAIN`에 — 다시 읽는 글이라 여백선)
- Test: `components/debate/__tests__/debate-section.test.ts`, `components/debate/__tests__/answer-composer.test.ts`, `lib/debate/__tests__/draft.test.ts`, `lib/shell/__tests__/routes.test.ts`(있으면 추가)

**Interfaces:**
- Consumes: Task 6 client 함수, Task 5 타입·`STANCE_LABEL`, 기존 `Sheet`, `Textarea variant="line"`, `Button`, `lib/motion.ts`.
- Produces: `DebateSection({ section, debate, onAnswer })`, `AnswerComposer({ debateId, target: {kind:'answer', position:number|null} | {kind:'reply', answerId} | {kind:'edit', answer}, onDone, onCancel })`.

- [ ] **Step 1: 실패 테스트**:
  - `DebateSection`: 머리줄 버튼 `aria-expanded=true` 기본, 누르면 false이고 picks가 사라지되 "답 9"와 분포 문구 "공감 3 · 다르게 읽음 5 · 질문 1"은 남는다; picks 라벨 "생각을 가장 많이 바꾼 답"/"다르게 본 쪽에서"(`plain`이면 라벨 없음); `count > picks` 이면 "나머지 7개 보기" → `fetchSectionAnswers` 호출 후 picks 제외 목록이 이어짐; 답 0개면 "아직 답이 없어요".
  - `AnswerComposer`: 입장 미선택이면 "남기기" disabled, 입장+본문이면 enabled; 남기기가 `postAnswer(id, {underline, stance, body, evidenceEntryId:null})`; 닫았다 다시 열면 초안 복원(`draft.ts`); 성공하면 초안 삭제; 답글 대상이면 입장 줄이 없다.
  - `draft.test.ts`: save/load/clear 키 형식.
- [ ] **Step 2: 실패 확인** — `npx vitest run components/debate lib/debate` → FAIL.
- [ ] **Step 3: 구현.** 화면은 시안 `answers-layout.html` B + `compose-close.html`. 문장 위 밑줄 누름 → 해당 단락 `scrollIntoView` + 펼침. 정리 간지는 문장 아래·질문 위, 짚은 답 누르면 그 답으로. 닫힌 토론은 단락 접힌 채 시작하고 답하기 버튼 없음, 안내 "정리된 토론이에요. 답을 읽고 “생각이 바뀌었어요”는 남길 수 있어요". 근거 붙이기는 Task 8의 `EntryPicker`를 그대로 쓰고, 고른 기록이 비공개면 "이 문장은 토론에 함께 남아요"를 보인다. 답 쓴 사람은 "생각이 바뀌었어요 N"을 눌러 누른 사람 목록(`get_debate_movers`, 기존 `LikersBottomSheet` 모양)을 본다. 고친 답에는 "고침". lg 이상은 왼쪽 문장·질문 sticky, 오른쪽 단락. 친구 아닌 작성자 이름은 링크 없음, 친구면 `/social/u/<nickname#tag>`. 신고한 답은 내 화면에서 접힌 줄("신고한 답이에요 · 펼치기"). 발제자 메뉴: 질문 고치기, 정리하기/정리 고치기/다시 열기, 토론 지우기(답 수 확인창). 낙관적 갱신은 move 토글만.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS, `npm run lint`.
- [ ] **Step 5: Commit** — `feat: 밑줄마다 단락으로 답을 읽고 쓰는 토론 화면을 더한다`

### Task 10: 소셜 탭의 [친구의 문장 | 토론]과 토론 목록

**Files:**
- Create: `app/(app)/social/talk/page.tsx`(+`loading.tsx`), `components/debate/DebateList.tsx`, `components/social/SocialSegment.tsx`
- Modify: `components/social/feed/SocialFeedView.tsx`(LargeTitle 아래 `SocialSegment active="feed"`), `lib/shell/routes.ts`(필요 시)
- Test: `components/debate/__tests__/debate-list.test.ts`

**Interfaces:**
- Consumes: Task 6 `fetchDebateList`; Task 4 목록 항목 모양.
- Produces: `SocialSegment({ active: 'feed'|'talk' })` — 두 링크(`/social`, `/social/talk`), `aria-current="page"`, 알약 분절(토큰만).
- 목록: 진행 중(밑줄 친 문장, 질문, 분포 한 줄, `top_line`은 "생각을 가장 많이 바꾼 답 · 도현" 또는 "새 답 · 윤서"), 아래 "정리된 토론"(문장 + 정리 첫 줄 + "답 9 · 생각이 바뀐 사람 4"), 각 목록 따로 더 보기·로딩·실패·다시 시도. 상단 "발제하기"(→ `/social/talk/new`). 빈 상태: "내 기록 하나를 고르고, 함께 볼 곳에 밑줄을 긋고, 질문을 붙여요" + 친구 0명이면 친구 찾기 링크.

- [ ] **Step 1: 실패 테스트** — 진행 중 2개·정리 1개 렌더, "발제하기" 링크 `/social/talk/new`; 빈 목록 문구; 정리 목록 실패 시 진행 중 목록은 그대로 보이고 정리 쪽에만 "다시 시도".
- [ ] **Step 2: 실패 확인** — `npx vitest run components/debate/__tests__/debate-list.test.ts` → FAIL.
- [ ] **Step 3: 구현.**
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS.
- [ ] **Step 5: Commit** — `feat: 소셜에서 친구의 문장과 토론을 오가고 토론 목록을 본다`

### Task 11: 운영 문서·전체 검사·화면 확인·Draft PR

**Files:**
- Create: `docs/operations/debate-reports.md`(신고 확인 SQL: 최근 신고 목록, 대상 답 본문 조회, 숨김 처리는 발제자 권한이라 운영자는 `service_role`로 `hidden_at` 설정 — 절차와 주의)
- Modify: `docs/superpowers/specs/2026-11-17-sentence-debate-design.md`(구현 중 정한 구현자 몫 값: 길이 상한·페이지 크기·신고 사유 4종 기록), `docs/operations/supabase-api-grants.md`(프로덕션 미적용 표시)

- [ ] **Step 1: 전체 검사** — `npm test`, `npm run lint`, `npm run build`, `npm run test:db` 모두 통과.
- [ ] **Step 2: 미리보기 서버로 화면 확인** — `docs/operations/preview-server.md` 절차(새 포트·분리 실행·로그). 환경 파일은 승인된 경로만. 로컬 DB/인증 없이 실제 데이터 화면이 안 열리면 그 사실을 기록하고 컴포넌트 단위·시안 대조로 확인한 범위를 구분한다. 확인 항목: 모바일 폭·라이트/다크·키보드로 발제 3단계, 펜 긋기, 토론 화면 접기·나머지 보기, 답 쓰기(시트/인라인), 정리 전후, 목록 빈 상태.
- [ ] **Step 3: push + Draft PR** — `git push -u origin feat/sentence-debate`, `gh pr create --draft`. 본문은 AGENTS.md 형식(무엇이 달라지나요 / 어떻게 바꾸었나요 / 확인한 내용). **프로덕션 마이그레이션 미적용**, 2차(알림) 남음, 실기기(iOS PWA 펜 긋기·시트 키보드)·두 계정 공개 범위 미검증을 명시.
- [ ] **Step 4: Notion** — 이슈 PR 칸에 PR 링크, 상태 In Review는 사용자 확인 뒤.
