# 사진에서 문장 옮기기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기록 폼의 "사진으로 옮기기" 버튼으로 책 페이지 사진을 받아, 사진 위에서 고른 문장을 문장 칸에 넣는다.

**Architecture:** 브라우저가 사진을 줄여 JPEG로 만들고 `POST /api/photo-text`로 보낸다. 서버는 로그인·기능 켜짐·동의와 하루 횟수(RPC 한 번)를 확인한 뒤 Google Vision을 호출해 낱말 좌표와 띄어쓰기만 돌려준다. 고르는 화면은 순수 계산(`lib/photo-quote/`)과 포인터 처리 컴포넌트(`components/photo-quote/`)로 나누고, 두 기록 폼은 같은 버튼 컴포넌트 하나를 쓴다.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase(Postgres RPC·RLS), Headless UI Dialog, Tailwind 토큰, vitest(+jsdom), PGlite 계약 검사, Google Cloud Vision REST, `heic-to`(지연 로드).

**Spec:** `docs/superpowers/specs/2026-11-20-photo-quote-design.md` — 조작의 원본은 `docs/design/photo-quote-2026-11/pick-spike.html`(돋보기 포함 최신본)이다.

## Global Constraints

- 사진과 읽은 글은 서버 로그·DB·Storage·PWA 캐시에 남기지 않는다. 서버 로그에는 사용자 id와 결과 종류만.
- `GOOGLE_VISION_API_KEY`는 서버에서만 읽는다. `NEXT_PUBLIC_` 접두어를 붙이지 않는다. 키를 worktree·로그·PR에 적지 않는다.
- 버튼은 `process.env.NEXT_PUBLIC_PHOTO_QUOTE_ENABLED === 'true'`일 때만 그린다.
- 상수: 긴 변 2,000px, JPEG 품질 0.9, 본문 상한 2MB, Vision 제한 15초, 하루 30장(KST 자정 초기화), `HOLD_MS` 320, `SLOP` 10, `MAX_ZOOM` 6, 두 번 두드리기 2.5배, 돋보기 1.6배.
- 동의 문구 판 번호 `PHOTO_TEXT_COPY_VERSION = 1`. 문구는 설계 문서 "동의" 절의 글자 그대로.
- 오류 코드: `session_expired`(401) `consent_required`(403) `daily_limit`(429) `too_large`(413) `read_failed`(502) `disabled`(404).
- 색·서체는 토큰만 쓴다(`dark:` 분기·임의 hex 금지). 아이콘은 `lucide-react`, 선 굵기 1.75. 대화상자 안의 버튼은 모두 `type="button"`(폼 안에서 열린다).
- 시험 파일은 `**/__tests__/**/*.test.ts`만 잡힌다. 컴포넌트 시험은 첫 줄 `// @vitest-environment jsdom`, JSX 대신 `createElement`.
- 커밋 메시지는 한국어 "행동의 언어", 끝에 `Co-Authored-By: Claude <noreply@anthropic.com>`.
- `PRIVACY_EFFECTIVE`, `LEGAL_ANNOUNCED`, `ACCOUNT_DELETION_EFFECTIVE_AT` 값은 바꾸지 않는다.

## Review Focus

1. 낱말이 하나도 없는 응답(빈 사진) → "글자 없음" 화면, "이 문장 쓰기"·"전부 가져오기" 꺼짐. (Task 1 `allText([])`, Task 7 시험)
2. 손잡이를 끌어 시작이 끝을 넘어간 구간 → 뒤집어 정리해 같은 글. (Task 1 `orderRange`)
3. 문장 칸에 글이 있는데 고른 글이 들어옴 → 덮어쓰지 않고 빈 줄 하나 뒤에 붙음, 끝 공백이 겹치지 않음. (Task 1 `appendQuote`)
4. 동시에 여러 요청 → 30장을 넘지 못함, 철회 직후 요청은 거절. (Task 3 계약 검사)
5. Vision이 200이지만 `responses[0].error`를 주거나 `fullTextAnnotation`이 없음 → 앞은 `read_failed`, 뒤는 낱말 0개의 정상 응답. (Task 2·4 시험)

---

### Task 1: 고르기 계산 (`lib/photo-quote/select.ts`)

**Files:**
- Create: `lib/photo-quote/types.ts`, `lib/photo-quote/select.ts`
- Test: `lib/photo-quote/__tests__/select.test.ts`

**Interfaces — Produces:**

```ts
// types.ts
export type Box = [x0: number, y0: number, x1: number, y1: number];
export interface PhotoWord { text: string; box: Box; sep: string }
export interface PhotoText { width: number; height: number; words: PhotoWord[] }
export interface View { x: number; y: number; z: number } // 화면 px 이동과 배율
export interface Size { w: number; h: number }

// select.ts
export const MAX_EDGE = 2000, MAX_ZOOM = 6, HOLD_MS = 320, SLOP = 10, DOUBLE_ZOOM = 2.5, LOUPE_SCALE = 1.6;
export function orderRange(a: number, b: number): [number, number];
export function rangeText(words: PhotoWord[], from: number, to: number): string; // 순서 무관, 마지막 sep은 버리고 trim
export function allText(words: PhotoWord[]): string;
export function wordAt(words: PhotoWord[], x: number, y: number): number; // 사진 좌표, 없으면 -1
export function appendQuote(current: string, picked: string): string;
export function fitWithin(w: number, h: number, max?: number): { width: number; height: number };
export function baseSize(stage: Size, image: Size): Size; // 사진을 stage 안에 맞춘 크기(가로 기준, 세로가 넘치면 세로 기준)
export function clampView(v: View, stage: Size, base: Size): View;
export function zoomAt(v: View, cx: number, cy: number, nz: number, stage: Size, base: Size): View; // (cx,cy)는 stage 좌표, 그 점이 제자리에 남는다
export function toImagePoint(v: View, cx: number, cy: number, base: Size, image: Size): { x: number; y: number };
```

- [ ] **Step 1: 실패하는 시험을 쓴다**

```ts
const W = (text: string, box: Box, sep = ' '): PhotoWord => ({ text, box, sep });
const line = [W('책을', [0, 0, 40, 20]), W('읽는', [50, 0, 90, 20]), W('일', [100, 0, 120, 20], '')];

it('고른 구간을 띄어쓰기 정보로 잇고 마지막 뒤는 버린다', () => {
  expect(rangeText(line, 0, 1)).toBe('책을 읽는');
  expect(rangeText(line, 2, 0)).toBe('책을 읽는 일'); // 뒤집힌 구간
  expect(rangeText([W('well', [0, 0, 1, 1], ''), W('known', [0, 2, 1, 3])], 0, 1)).toBe('wellknown'); // HYPHEN → ''
});
it('빈 낱말 목록은 빈 글', () => { expect(allText([])).toBe(''); expect(wordAt([], 5, 5)).toBe(-1); });
it('손가락 아래 낱말, 없으면 같은 줄의 가까운 낱말을 먼저 잡는다', () => {
  const two = [...line, W('아래', [100, 30, 140, 50])];
  expect(wordAt(two, 60, 10)).toBe(1);
  expect(wordAt(two, 135, 12)).toBe(2); // 아래 줄 낱말이 가로로는 더 가깝지만 같은 줄을 잡는다
});
it('문장 칸이 비면 그대로, 있으면 빈 줄 하나 뒤에 붙인다', () => {
  expect(appendQuote('', '새 문장')).toBe('새 문장');
  expect(appendQuote('쓰던 글\n\n', '새 문장')).toBe('쓰던 글\n\n새 문장');
  expect(appendQuote('쓰던 글', '')).toBe('쓰던 글');
});
it('긴 변을 2000으로 줄이고 작은 사진은 그대로', () => {
  expect(fitWithin(4000, 3000)).toEqual({ width: 2000, height: 1500 });
  expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
});
it('키워도 가리킨 점이 제자리에 있고 배율은 1~6', () => {
  const stage = { w: 300, h: 400 }, base = { w: 300, h: 400 };
  const v = zoomAt({ x: 0, y: 0, z: 1 }, 150, 200, 2, stage, base);
  expect(v).toEqual({ x: -150, y: -200, z: 2 });
  expect(zoomAt(v, 0, 0, 99, stage, base).z).toBe(6);
  expect(clampView({ x: 50, y: 50, z: 1 }, stage, base)).toEqual({ x: 0, y: 0, z: 1 });
});
```

- [ ] **Step 2:** `npx vitest run lib/photo-quote` → FAIL(모듈 없음)
- [ ] **Step 3: 구현** — `wordAt`은 실험과 같이 상자 밖 거리 `dx + 4*dy`가 가장 작은 낱말(상자 안이면 0). `clampView`는 실험의 `clamp()`: 사진(base×z)이 stage보다 작으면 가운데, 크면 가장자리를 넘지 않게.
- [ ] **Step 4:** `npx vitest run lib/photo-quote` → PASS
- [ ] **Step 5: Commit** `feat: 사진에서 고른 낱말을 문장으로 잇는 계산을 더한다`

### Task 2: Vision 응답 정리 (`lib/photo-quote/vision.ts`)

**Files:**
- Create: `lib/photo-quote/vision.ts`
- Test: `lib/photo-quote/__tests__/vision.test.ts`

**Interfaces — Produces:**

```ts
export class PhotoReadError extends Error {} // Vision 실패·시간 초과
export function parseVision(json: unknown): PhotoText; // responses[0].error가 있으면 PhotoReadError
export async function readPhotoText(jpeg: Uint8Array, key: string, signal?: AbortSignal): Promise<PhotoText>;
```

- [ ] **Step 1: 시험** — `parseVision`: `detectedBreak.type`이 `SPACE`/`EOL_SURE_SPACE`/`LINE_BREAK`면 `sep ' '`, `HYPHEN`이면 `''`, 없으면 `''`; `box`는 네 꼭짓점의 최소·최대(빠진 좌표는 0); `width/height`는 `pages[0]`; `fullTextAnnotation`이 없으면 `{ width: 0, height: 0, words: [] }`; `responses[0].error`면 throw. `readPhotoText`: `vi.stubGlobal('fetch', …)`로 요청이 `https://vision.googleapis.com/v1/images:annotate`, 헤더 `X-Goog-Api-Key`, 본문 `requests[0].features[0].type === 'DOCUMENT_TEXT_DETECTION'`, `image.content`가 base64인지, 그리고 URL에 키가 없는지 확인. `!res.ok`와 fetch reject는 `PhotoReadError`.
- [ ] **Step 2:** 실행 → FAIL
- [ ] **Step 3: 구현** — 15초 제한은 `AbortSignal.timeout(15_000)`을 호출자 signal과 `AbortSignal.any`로 묶는다. 오류 메시지에 응답 본문·키를 넣지 않는다.
- [ ] **Step 4:** PASS
- [ ] **Step 5: Commit** `feat: Google Vision이 읽은 글자를 낱말 좌표와 띄어쓰기로 정리한다`

### Task 3: 동의와 하루 한도 DB

**Files:**
- Create: `supabase/migrations/20261120120000_photo_text.sql`
- Create: `supabase/tests/photo_text_contract.sql`, `supabase/tests/run-photo-text-contract.mjs`(틀은 `run-monthly-sentences-contract.mjs` 그대로, 파일 이름만 바꾼다)

**Interfaces — Produces (모두 `auth.uid()` 기준, `security definer`, `set search_path=''`, `authenticated`에만 execute):**

```sql
public.photo_text_consents(user_id uuid pk → auth.users on delete cascade, copy_version int not null, consented_at timestamptz not null, withdrawn_at timestamptz)
public.photo_text_usage(user_id uuid → auth.users on delete cascade, day date, count int check (count between 1 and 30), primary key(user_id, day))
public.set_photo_text_consent(p_version int) returns void        -- upsert, withdrawn_at = null
public.withdraw_photo_text_consent() returns void                 -- withdrawn_at = now()
public.photo_text_consented(p_version int) returns boolean
public.begin_photo_text_read(p_version int) returns text          -- 'ok' | 'consent_required' | 'daily_limit'
```

- RLS 켬. `anon`·`authenticated`의 테이블 권한은 모두 revoke하고 `consents`만 본인 `select` 정책과 grant. `usage`는 클라이언트 권한 없음. `service_role`에 `grant all`.
- `begin_photo_text_read`: 로그인 없으면 `'consent_required'`. 동의 줄이 없거나 `withdrawn_at`이 있거나 판이 다르면 `'consent_required'`. 날짜는 `(now() at time zone 'Asia/Seoul')::date`. 지난 날의 본인 줄을 지운 뒤 `insert … values(uid, today, 1) on conflict (user_id, day) do update set count = usage.count + 1 where usage.count < 30 returning count` — 돌아온 줄이 없으면 `'daily_limit'`.

- [ ] **Step 1: 계약 SQL을 먼저 쓴다** (`raise exception`이 실패): A가 동의 전 `begin` → `consent_required`; 동의 뒤 30번 `ok`, 31번째 `daily_limit`; usage의 day를 어제로 돌리면 다시 `ok`이고 어제 줄은 사라짐; 판 2로 물으면 `consent_required`; 철회 뒤 `consent_required`와 `photo_text_consented(1) = false`; `set role authenticated` + A의 claims로 B의 consents가 0줄, `insert`/`update`는 `permission denied`, usage `select`는 `permission denied`; `anon`은 함수 실행 `permission denied`; `delete from auth.users`로 두 테이블의 줄이 사라짐.
- [ ] **Step 2:** `node supabase/tests/run-photo-text-contract.mjs` → FAIL(테이블 없음)
- [ ] **Step 3:** 마이그레이션 작성
- [ ] **Step 4:** `npm run test:db` → 전부 통과(다른 계약 검사가 새 테이블 때문에 깨지면 그 검사가 요구하는 대로 맞춘다)
- [ ] **Step 5: Commit** `feat: 사진 글자 읽기 동의와 하루 30장 한도를 DB에 둔다`

### Task 4: 서버 경로

**Files:**
- Create: `lib/photo-quote/config.ts`, `app/api/photo-text/route.ts`, `app/api/photo-text/consent/route.ts`
- Test: `app/api/photo-text/__tests__/route.test.ts`, `app/api/photo-text/__tests__/consent.test.ts`

**Interfaces:**
- Consumes: `readPhotoText`, `PhotoReadError`(Task 2), RPC 이름(Task 3), `unauthorized()`(`lib/api/auth.ts`), `createSupabaseServerClient`.
- Produces:

```ts
// config.ts (클라이언트·서버 공용, 비밀값 없음)
export const PHOTO_TEXT_COPY_VERSION = 1;
export const PHOTO_TEXT_MAX_BYTES = 2 * 1024 * 1024;
export function photoQuoteVisible(): boolean; // NEXT_PUBLIC_PHOTO_QUOTE_ENABLED === 'true'
export type PhotoTextErrorCode = 'consent_required' | 'daily_limit' | 'too_large' | 'read_failed' | 'disabled';
```

`POST /api/photo-text` → 200 `PhotoText` 또는 `{ code, error }`. `GET /api/photo-text/consent` → `{ consented: boolean }`, `POST` → `{ consented: true }`, `DELETE` → `{ consented: false }`. 모든 응답에 `Cache-Control: private, no-store, max-age=0`. `export const runtime = 'nodejs'`, `maxDuration = 30`.

- [ ] **Step 1: 시험** (`comments/__tests__/route.test.ts`처럼 `createSupabaseServerClient`를 mock, `rpc` 스텁, `vi.stubEnv`, `vi.mock('@/lib/photo-quote/vision')`):
  - 로그인 없음 → 401 `session_expired`, `rpc`·Vision 호출 없음
  - 플래그 꺼짐 또는 키 없음 → 404 `disabled`, `rpc` 호출 없음
  - `Content-Type`이 `image/jpeg`가 아님 → 400; 본문 2MB+1 → 413 `too_large`, `rpc` 호출 없음(횟수를 쓰지 않는다); `Content-Length`가 거짓으로 작아도 실제 바이트로 거절
  - 빈 본문 → 400
  - rpc `'consent_required'` → 403, `'daily_limit'` → 429, 둘 다 Vision 호출 없음; rpc 오류 → 503
  - Vision이 `PhotoReadError` → 502 `read_failed`
  - 정상 → 200, 본문이 `PhotoText` 그대로; `console.*`에 넘긴 인자 어디에도 낱말 글자가 없음(`vi.spyOn(console, 'error')` 등)
  - consent: `POST`는 `set_photo_text_consent`에 `{ p_version: 1 }`, `DELETE`는 `withdraw_photo_text_consent`, 다른 출처(`origin` 헤더 불일치)는 403, 플래그가 꺼져도 `DELETE`와 `GET`은 동작(철회는 언제나 가능)
- [ ] **Step 2:** FAIL
- [ ] **Step 3: 구현** — 순서: 로그인 → 켜짐 → 형식·크기(`await req.arrayBuffer()` 뒤 `byteLength`) → `begin_photo_text_read` → Vision. 출처 확인은 `lib/push/server.ts`의 `sameOrigin`과 같은 규칙.
- [ ] **Step 4:** `npx vitest run app/api/photo-text` → PASS
- [ ] **Step 5: Commit** `feat: 동의한 사람의 사진만 Google Vision으로 읽어 주는 경로를 더한다`

### Task 5: 사진 준비 (`lib/photo-quote/image.ts`)

**Files:**
- Create: `lib/photo-quote/image.ts`
- Modify: `package.json`(`heic-to`), `NOTICE`
- Test: `lib/photo-quote/__tests__/image.test.ts`

**Interfaces — Produces:**

```ts
export class PhotoOpenError extends Error {}
export function isHeic(file: { type: string; name: string }): boolean; // image/heic·heif 또는 .heic/.heif(대소문자 무시)
export interface PreparedPhoto { blob: Blob; url: string; width: number; height: number } // url은 호출자가 revoke
export async function preparePhoto(file: File, onConverting?: () => void): Promise<PreparedPhoto>;
```

- [ ] **Step 1: 시험** — `isHeic`: `{type:'image/heic',name:'a'}`, `{type:'',name:'IMG_1.HEIC'}`, `{type:'image/heif',name:'x'}` 참, `{type:'image/jpeg',name:'heic.jpg'}` 거짓.
- [ ] **Step 2:** FAIL → **Step 3: 구현**
  - `createImageBitmap(file, { imageOrientation: 'from-image' })` 시도 → 실패하고 `isHeic`이면 `onConverting?.()` 뒤 `const { heicTo } = await import('heic-to')`로 JPEG Blob을 만들어 다시 연다. 그래도 실패하거나 HEIC이 아니면 `PhotoOpenError`.
  - `fitWithin`(Task 1)으로 캔버스 크기를 정해 그리고 `toBlob('image/jpeg', 0.9)`. 결과가 `PHOTO_TEXT_MAX_BYTES`를 넘으면 품질 0.8 → 0.7로 다시 만든다.
  - `npm install heic-to`. 설치한 패키지의 `LICENSE`를 읽어 `NOTICE`의 제3자 자료 문단에 "HEIC 사진 변환(heic-to, libheif — 각 라이선스)은 필요할 때만 따로 내려받는다"를 실제 라이선스 이름으로 적는다. 라이선스가 배포와 맞지 않으면 `heic2any`로 바꾸고 같은 확인을 한다.
- [ ] **Step 4:** `npx vitest run lib/photo-quote` PASS, `npm run build` 뒤 `heic-to`가 별도 청크인지 확인(`grep -rl libheif .next/static/chunks | head` 결과가 첫 화면 청크 목록 `.next/build-manifest.json`의 `rootMainFiles`·`/today` 항목에 없어야 한다).
- [ ] **Step 5: Commit** `feat: 사진을 줄여 JPEG로 만들고 HEIC은 필요할 때만 기기 안에서 바꾼다`

### Task 6: 고르는 판 (`components/photo-quote/PickStage.tsx`)

사진을 키우고 옮기며 구간을 고르는 부분만 맡는다. 버튼·상태 문구는 Task 7.

**Files:**
- Create: `components/photo-quote/PickStage.tsx`, `components/photo-quote/photoQuote.module.css`
- Test: `components/photo-quote/__tests__/pick-stage.test.ts`

**Interfaces:**
- Consumes: Task 1 전부.
- Produces:

```ts
export interface PickStageHandle { zoomBy(factor: number): void; fit(): void; panBy(dx: number, dy: number): void }
export interface PickStageProps {
  src: string; image: Size; words: PhotoWord[];
  range: [number, number] | null;              // 정리되지 않은 [anchor, focus]
  onRange(range: [number, number] | null): void;
  ref?: React.Ref<PickStageHandle>;
}
```

구현 기준(실험 `pick-spike.html`의 pointerdown/move/up 상태기계를 옮긴다):
- 상태 `idle | pending | pan | pinch | select | knob`. `pointerType === 'touch' | 'pen'`: 낱말 위에서 320ms 누르면 `select`, 그 전에 10px 넘게 움직이면 `pan`. `pointerType === 'mouse'`: 낱말 위(상자 안)에서 누르면 바로 `select`, 빈 곳은 `pan`.
- 두 번 두드리기/더블클릭(300ms·24px 안) → 2.5배 ↔ 맞춤. 휠은 옮기기, `ctrlKey || metaKey` 휠은 키우기(`deltaY<0 ? 1.15 : 1/1.15`).
- 고른 구간은 낱말 상자마다 `bg-accent/30` 사각형, 양 끝 손잡이는 화면 고정 크기(지름 20px, 닿는 영역 44px).
- `select`·`knob` 중 가장자리 36px 안이면 `requestAnimationFrame`으로 그쪽으로 민다(실험 `edgeScroll`).
- 돋보기: `pointerType`이 touch/pen이고 `select`·`knob`일 때만. 168×76px, 손가락 위 28px, 위 자리가 없으면 아래. 내용은 같은 사진을 `Math.max(base*z/image.w*1.6, 0.9)` 배율로.
- `touchstart`·`touchmove`는 `{ passive: false }`로 직접 붙여 `preventDefault`(React의 on* 속성은 passive다). `selectstart`·`contextmenu`·`dragstart`도 막는다. CSS: `touch-action: none; user-select: none; -webkit-touch-callout: none;` 사진은 `draggable={false}`.
- 변환은 `transform: translate3d(x,y,0) scale(z)`. `prefers-reduced-motion`이면 두 번 두드리기 전환에 transition 없음.
- 낱말 상자는 그리지 않는다. 사진 `alt=""`, 판에 `role="application"` `aria-label="사진에서 문장 고르기"` `tabIndex=0`, 키 `+`/`=`/`-`와 화살표(48px씩).

- [ ] **Step 1: 시험** (jsdom, `PointerEvent`가 없으면 `MouseEvent`를 상속한 대역을 `stubGlobal`; `getBoundingClientRect`를 300×400으로 스텁):
  - 마우스로 첫 낱말 위에서 `pointerdown` → 셋째 낱말 위로 `pointermove` → `pointerup`이면 `onRange`가 `[0, 2]`로 불린다
  - 터치로 누르고 320ms 전에 놓으면 `onRange`가 불리지 않는다(`vi.useFakeTimers`); 320ms 지난 뒤 움직이면 불린다
  - 터치로 누르자마자 20px 움직이면 고르지 않는다
  - `range`가 주어지면 손잡이 두 개(`data-knob="start"`, `"end"`)가 그려진다
- [ ] **Step 2:** FAIL → **Step 3: 구현** → **Step 4:** PASS, `npm run lint`
- [ ] **Step 5: Commit** `feat: 사진을 키우고 옮기며 길게 눌러 문장을 고르는 판을 만든다`

### Task 7: 고르는 화면과 버튼 (`PhotoPicker`, `PhotoQuoteButton`)

**Files:**
- Create: `components/photo-quote/PhotoPicker.tsx`, `components/photo-quote/PhotoQuoteButton.tsx`, `components/photo-quote/PhotoConsentSheet.tsx`
- Test: `components/photo-quote/__tests__/photo-quote-button.test.ts`

**Interfaces:**
- Consumes: `PickStage`(Task 6), `preparePhoto`·`PhotoOpenError`(Task 5), `config.ts`(Task 4), `apiFetch`, `Sheet`, `Button`.
- Produces:

```ts
// 기능이 꺼져 있으면 null을 그린다
export default function PhotoQuoteButton(props: { onText(text: string): void; disabled?: boolean; className?: string }): JSX.Element | null;
```

흐름(`PhotoQuoteButton`이 쥔 상태 `closed | checking | consent | source | picking`):
1. 누르면 `GET /api/photo-text/consent`. `consented`가 거짓이면 `PhotoConsentSheet`(제목 "사진 속 글자를 읽으려면", 본문은 설계 문서 글자 그대로, "동의하고 계속"은 `POST` 뒤 2로, "취소"). 확인 요청이 실패하면 `toast.error('잠시 뒤 다시 시도해 주세요.')`.
2. 사진 받기: `window.matchMedia('(pointer: fine)').matches`면 바로 `capture` 없는 파일 입력을 연다. 아니면 `Sheet`(제목 "사진으로 옮기기")에 "사진 찍기"(`capture="environment"`)와 "앨범에서 고르기" 두 버튼. 입력은 `accept="image/*,.heic,.heif"`, 숨긴 `<input>` 두 개를 `ref.click()`으로 연다. 같은 파일을 다시 고를 수 있도록 고른 뒤 `value = ''`.
3. `PhotoPicker`: Headless UI `Dialog`(`static` 없이 `open`), `className="relative z-[110]"`, 패널은 `fixed inset-0 bg-[rgb(var(--scrim))] text-white`(사진이 잘 보이게 어두운 바탕 — 라이트·다크 같은 값), lg 이상은 `lg:inset-6 lg:rounded-[16px]`. 머리줄: "닫기", 오른쪽 "다시 찍기". 가운데 `PickStage`. 정밀 포인터에서만 판 오른쪽 아래에 `ZoomIn`/`ZoomOut`/`Maximize` 아이콘 버튼(이름 "확대", "축소", "화면에 맞추기"). 아래: 상태 문구 한 줄(`role="status"`) + "전부 가져오기"(secondary) + "이 문장 쓰기"(primary).
4. 상태별 문구는 설계 문서의 표 그대로: 준비 중 "사진을 준비하는 중…"(HEIC 변환), 읽는 중 "글자를 읽는 중…", 읽음 "첫 낱말을 길게 누른 채 끝까지 끌어 보세요"(정밀 포인터에서는 "첫 낱말에서 끝 낱말까지 끌어 보세요"), 글자 없음, 실패(+ "다시 시도"), 하루 한도, 열지 못함. `consent_required`가 오면(다른 기기에서 철회) 화면을 닫고 동의 시트로 돌아간다. `SessionExpiredError`는 조용히 닫는다.
5. 요청: `apiFetch('/api/photo-text', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob, signal })`. 화면을 닫거나 다시 찍으면 `abort`하고 `URL.revokeObjectURL`.
6. 파일을 화면에 끌어다 놓으면(`dragover`/`drop`, 이미지 파일만) 그 사진으로 바꾼다.
7. "이 문장 쓰기" → `onText(rangeText(words, …))`, "전부 가져오기" → `onText(allText(words))`, 둘 다 닫는다. 닫기·Esc는 `onText`를 부르지 않는다.

- [ ] **Step 1: 시험** (jsdom; `@/lib/api/fetch`와 `@/lib/photo-quote/image`를 mock, `vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', 'true')`, `matchMedia` 스텁):
  - 플래그가 꺼지면 아무것도 그리지 않는다
  - 동의 전: 버튼 → 동의 시트 제목이 보이고, "취소"면 사진 입력이 열리지 않고 `POST`도 없다
  - "동의하고 계속" → `POST /api/photo-text/consent` 뒤 사진 받기 시트
  - 동의됨 + 사진 고름 + 읽기 성공(`words` 3개) → "전부 가져오기"가 `onText('책을 읽는 일')`을 부르고 대화상자가 닫힌다; "이 문장 쓰기"는 고르기 전 `disabled`
  - `words: []` → "이 사진에서 글자를 찾지 못했어요. 더 밝은 곳에서 다시 찍어 보세요.", 두 버튼 `disabled`
  - 429 `daily_limit` → "오늘은 사진을 더 읽을 수 없어요. 내일 다시 쓸 수 있어요."
  - 502 → "글자를 읽지 못했어요."와 "다시 시도", 누르면 같은 blob으로 다시 요청
  - Esc → `onText` 불리지 않음, `URL.revokeObjectURL` 불림
- [ ] **Step 2:** FAIL → **Step 3: 구현** → **Step 4:** PASS, `npm run lint`
- [ ] **Step 5: Commit** `feat: 사진을 찍어 고른 문장을 돌려주는 "사진으로 옮기기" 버튼을 만든다`

### Task 8: 기록 폼 두 곳에 붙이기

**Files:**
- Modify: `components/today/ComposerView.tsx`(공개 토글 행 `mt-0.5 flex items-center`), `components/entries/EntryFormBody.tsx`(문장 라벨 줄)
- Test: `components/today/__tests__/composer-photo-quote.test.ts`, `components/entries/__tests__/form-photo-quote.test.ts`

**Interfaces — Consumes:** `PhotoQuoteButton`(Task 7), `appendQuote`(Task 1).

- `ComposerView`: 공개 토글 버튼 오른쪽에 `<PhotoQuoteButton className="ml-auto" disabled={disabled} onText={…} />`. `onText`는 `props.onChange('quote', appendQuote(quote, text))` 뒤 `setSecondaryOpen(true)`(주 입력이 "생각"이어도 문장 칸이 보인다), 다음 프레임에 문장 칸(`mode === 'quote'`면 주 칸, 아니면 보조 칸)에 포커스하고 커서를 끝에 둔다. 두 textarea에 ref를 단다. `Composer.tsx`는 고치지 않는다(`onChange`가 초안에 넣는다).
- `EntryFormBody`: 라벨 줄을 `flex items-center justify-between`으로 감싸 오른쪽에 버튼. `onText`는 `setQuote((q) => appendQuote(q, text))`, 내용 오류가 떠 있으면 지우고, `quoteRef`에 포커스·커서 끝. `disabled={locked}`.
- 버튼 모양: 44×44px 닿는 영역, `Camera` 아이콘 20px, `text-ink-sub hover:text-ink`, `aria-label="사진으로 옮기기"`.

- [ ] **Step 1: 시험** — `PhotoQuoteButton`을 `vi.mock`으로 `onText('새 문장')`을 부르는 버튼으로 바꿔서:
  - `EntryFormBody` 초기 `quote: '쓰던 글'` → 문장 칸 값이 `'쓰던 글\n\n새 문장'`, 포커스가 문장 칸
  - `ComposerView` `mode: 'note', quote: ''` → `onChange`가 `('quote', '새 문장')`으로 불린다
  - 기존 `form-accessibility.test.ts`와 `responsive-composer.test.ts`가 그대로 통과
- [ ] **Step 2:** FAIL → **Step 3: 구현** → **Step 4:** `npx vitest run components` PASS
- [ ] **Step 5: Commit** `feat: 오늘 화면과 기록 폼에서 사진으로 문장을 옮겨 올 수 있다`

### Task 9: 설정에서 동의 철회

**Files:**
- Create: `components/settings/PhotoTextConsent.tsx`
- Modify: `components/settings/Sections.tsx`(`AccountSection`에 행 하나, 플래그가 켜졌을 때만), `components/settings/SettingsScreen.tsx`
- Test: `components/settings/__tests__/photo-text-consent.test.ts`

- 행 "사진 글자 읽기 동의"를 누르면 `Sheet`가 열리고 그때 `GET`으로 상태를 읽는다(설정을 열 때 미리 읽지 않는다). 동의함이면 "사진을 Google(미국)로 보내 글자를 읽는 데 동의했어요." + "동의 철회"(`DELETE`, 성공하면 `toast.success('동의를 철회했어요.')`), 아니면 "아직 동의하지 않았어요. 기록 폼의 사진으로 옮기기를 처음 누를 때 물어봐요." 불러오기 실패는 "불러오지 못했어요." + "다시 시도".

- [ ] **Step 1: 시험** — 열면 `GET` 한 번; 동의함 → "동의 철회" 누르면 `DELETE` 뒤 문구가 "아직 동의하지 않았어요…"로 바뀜; `GET` 실패 → "다시 시도".
- [ ] **Step 2~4:** FAIL → 구현 → PASS
- [ ] **Step 5: Commit** `feat: 설정에서 사진 글자 읽기 동의를 확인하고 철회할 수 있다`

### Task 10: 방침·운영 문서

**Files:**
- Modify: `lib/legal/texts.ts`, `lib/legal/__tests__/blocks.test.ts`, `docs/operations/privacy-release.md`, `AGENTS.md`(코드 탐색 절에 한 줄), `docs/superpowers/specs/2026-11-20-photo-quote-design.md`(구현하며 정한 것)

- `texts.ts`에 상수 추가(Web Push 선례의 자리 옆):
  ```ts
  /** 선택 "사진 글자 읽기" 항목 공고일 — 이 날 배포돼 화면에 실려야 한다. 배포가 늦어지면 아래 시각과 함께 미룬다 */
  export const PHOTO_TEXT_PRIVACY_ANNOUNCED = '2026년 11월 21일';
  /** 공고 뒤 7일(방침 제11조). 그 전에도 기능 안에서 따로 동의한 이용자에게는 연다 — 기능을 날짜로 막지 않는다 */
  export const PHOTO_TEXT_PRIVACY_EFFECTIVE_AT = '2026-11-28T00:00:00+09:00';
  ```
- `PRIVACY_POLICY` 제1조에 7호 "선택한 사진 글자 읽기를 쓸 때 처리하는 정보"(찍은 책 페이지 사진 — 저장하지 않음, 동의 시각과 문구 판, 하루 사용 횟수; 기능 안에서 따로 동의한 경우에만), 제2조에 6호 목적, 제2조 맺음 문단의 "4~5호"를 "4~6호"로, 제5조에 Google LLC 항(설계 문서 문장), 제7조 3항에 "사진 글자 읽기에 쓴 사진과 읽은 결과도 저장하지 않습니다.", 부칙 문장 뒤에 "선택 항목인 사진 글자 읽기에 관한 내용은 ${PHOTO_TEXT_PRIVACY_ANNOUNCED} 공고하며 2026년 11월 28일부터 시행하되, 그 전에는 기능 안에서 따로 동의한 이용자에게만 적용합니다."
- `LEGAL_REVISION.privacyChanges`에 한 줄: "사진으로 문장을 옮길 때(선택) 찍은 사진을 Google(미국)로 보내 글자를 읽어요. 처음 쓸 때 따로 동의를 받고, 사진은 저장하지 않아요."
- 지난 판 보관(`archive.ts`)은 건드리지 않는다 — 12월 13일 판이 아직 시행 전이라 지난 판이 새로 생기지 않는다.
- `privacy-release.md`에 절 "사진에서 문장 옮기기 (2026-11-20, 코드 머지 전)": 전송 경로(브라우저 → `/api/photo-text` → Vision, 본문만), 남기지 않는 것, 동의·철회 뒤 동작, 환경 변수 두 개, 적용 순서(마이그레이션 → 환경 변수 → 배포 → 공고일 확인), 되돌릴 때(플래그 끄기), 미검증 목록.

- [ ] **Step 1: 시험** — `blocks.test.ts`에: `PRIVACY_EFFECTIVE`가 그대로 `'2026년 12월 13일'`; `PRIVACY_POLICY`에 `'Google LLC(미국) — 사진 속 글자 읽기(Cloud Vision)'`와 `PHOTO_TEXT_PRIVACY_ANNOUNCED`가 들어 있음; `Date.parse(PHOTO_TEXT_PRIVACY_EFFECTIVE_AT)`가 `Date.parse(ACCOUNT_DELETION_EFFECTIVE_AT)`보다 앞.
- [ ] **Step 2~4:** FAIL → 고침 → `npx vitest run lib/legal` PASS, `/privacy`의 조문 나누기(`blocks.ts`)가 새 항목을 올바로 그리는지 기존 시험으로 확인
- [ ] **Step 5: Commit** `docs: 사진 글자 읽기의 국외 전송과 동의를 개인정보처리방침과 운영 문서에 적는다`

### Task 11: 전체 확인과 Draft PR

- [ ] `npm test`, `npm run lint`, `npm run build`, `npm run test:db` — 최신 커밋에서 모두 통과
- [ ] 화면 확인(Playwright, `/api/photo-text*`를 `page.route`로 흉내 — 실제 Vision 호출이 아님을 PR에 적는다): 모바일 390×844와 데스크톱 1280×800, 라이트·다크, 키보드만으로 버튼 → 동의 → 전부 가져오기 → 문장 칸, 마우스 끌어 고르기·휠·확대 버튼, 읽는 중·글자 없음·실패·한도. 로그인이 필요한 화면을 띄울 환경이 없으면 미검증으로 적는다.
- [ ] HEIC: `sips -s format heic`로 만든 HEIC 파일을 Chromium에서 `preparePhoto`로 열어 본다(아이폰이 찍은 원본이 아님을 적는다).
- [ ] `docs/design/photo-quote-2026-11/`의 실험 파일은 조작의 근거로 남긴다.
- [ ] push 후 Draft PR(AGENTS.md 본문 구성). 본문에 구분해서 적는다: 코드 완료 / 검사 / 미적용 마이그레이션 / 운영자가 할 일(키·플래그·예산 알림·기존 사용자 안내) / 실기기 미확인(iOS Safari·설치형 PWA·Android Chrome의 길게 누르기·두 손가락 확대·돋보기) / 법적 충분성 미확정.
