# 일기장과 간지 — 토대 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 새 디자인의 모든 화면이 올라설 토대 — 색·글자·괘선 토큰, 간지 재질과 간지 묶음(`Pile`), Apple식 화면 틀(상단 바·탭 바·사이드바)·장 넘김·바텀 시트 — 를 `redesign` 브랜치에 세 개의 Draft PR로 쌓는다.

**Architecture:** 토큰은 지금처럼 `app/globals.css`의 RGB 트리플릿 CSS 변수 → `tailwind.config.js` → `components/ui/` 순서로 흐른다. 시안의 순수 계산(간지 자리·기울기·넘김 거리·끌기 저항, 경로별 화면 틀·탭)은 `lib/`의 순수 함수로 떼어 vitest로 고정하고, 컴포넌트는 그 값을 그리기만 한다. 화면 이전 전이라 실제 화면은 아직 옛 모습이므로, 프로덕션에서는 404인 견본 화면 `/design-lab`에서 시안과 나란히 비교한다.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 3, Headless UI 2, framer-motion 12, lucide-react, vitest(+jsdom, @testing-library/react).

**Spec:** `docs/superpowers/specs/2026-10-20-diary-vellum-redesign-design.md` (2·5·6·7절). 값의 원본: `docs/design/concept-2026-10/app.css`, `pile.js`, `shell.js`, README "구현으로 옮길 핵심".

## Global Constraints

- 시안 값·곡선·시간·자리는 그대로 가져온다. 바꾸면 이 계획 또는 PR 본문에 이유를 남긴다.
- **예외:** 다크 `accent`는 `133 169 236`(#85A9EC), 다크 `ink-faint`는 `142 132 118`(#8E8476) — 시안 값이 아니라 현행 값.
- 토큰 이름은 유지하고 값만 바꾼다. 일반 컴포넌트에 `dark:` 분기, 임의 hex, `blue-500` 같은 원색 팔레트를 쓰지 않는다(시안에서 다크 전용으로 정한 재질 그림자·선택 표시는 CSS의 `prefers-color-scheme` 블록에 둔다).
- 깊이(그림자·반투명)는 간지에만: 회상, 덧붙인 생각 묶음, 발췌집, 달마다 간지, 책 한 권의 기록 간지, 바텀 시트, 탭 바·상단 바·사이드바 재질. 일반 카드·도구는 헤어라인. 글라스모피즘(강한 blur 위주)으로 바꾸지 않는다.
- `prefers-reduced-transparency: reduce` → 간지·바 재질은 불투명 `rgb(var(--sheet))`. `prefers-reduced-motion: reduce` → 이동을 빼고 흐림만.
- 데스크톱 경계는 1024px(Tailwind `lg:`). 아이콘은 `lucide-react`, `strokeWidth={1.75}`.
- 곡선 토큰 `--ease-out`·`--ease-in-out`·`--ease-drawer`는 유지. `--ease-page`는 이번 범위에서 건드리지 않는다(6절 9에서 제거).
- 각 PR은 별도 worktree·브랜치에서 작업하고 `redesign`을 대상으로 **Draft PR**. 브랜치 prefix `feat/`. PR 제목·본문은 행동의 언어(AGENTS.md "작업 흐름 3"). 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`, PR 본문 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- 환경 파일·비밀값을 worktree에 복사하지 않는다. 화면 확인은 push 후 Vercel 브랜치 미리보기(보호 우회 링크는 Vercel MCP `get_access_to_vercel_url`)에서 한다. 미리보기는 **프로덕션 Supabase**(`piqlggyuhhicnjywombg`, 유일한 프로젝트)를 쓰므로 데이터를 만드는 조작은 하지 않는다.
- 로그인이 필요한 화면의 실제 확인은 사용자가 한다. 에이전트는 로그인 없이 볼 수 있는 `/design-lab`과 비로그인 화면만 직접 확인하고, 나머지는 PR에 미검증으로 적는다.

## PR 구성

| PR | 브랜치 | 기준(base) | PR 대상 | 내용 |
| -- | ------ | ---------- | ------- | ---- |
| ① | `feat/redesign-tokens` | `origin/redesign` | `redesign` | Task 1–4: 색·글자·괘선 + 문서 |
| ② | `feat/redesign-vellum-pile` | `feat/redesign-tokens` | `redesign` | Task 5–8: 간지 재질·`Pile`·견본 화면 |
| ③ | `feat/redesign-shell` | `feat/redesign-vellum-pile` | `redesign` | Task 9–14: 화면 틀·장 넘김·바텀 시트 |

②③은 앞 PR 위에 쌓는다(머지를 기다리지 않고 진행). PR 본문 첫 줄에 "#① 위에 쌓였습니다. ①이 머지되면 이 PR의 diff는 자기 변경만 남습니다."를 적는다. 앞 PR이 리뷰로 바뀌면 뒤 브랜치를 rebase한다.

worktree 만들기(PR ① 예시, 기본 checkout `/Users/drchasekim/Developer/readiary`에서):

```sh
git fetch origin redesign
git worktree add ../readiary-redesign-tokens -b feat/redesign-tokens origin/redesign
cd ../readiary-redesign-tokens && npm ci
```

이 계획 파일은 PR ①의 첫 커밋으로 넣는다(`docs: 새 디자인 토대 구현 계획을 기록한다`).

## Review Focus

1. **설치형 iPhone PWA의 안전 영역과 주소창 접힘** — 탭 바는 홈 인디케이터 위 `10px + safe-bottom`에 떠 있고, 장 높이(`--vh`)는 폭이 바뀔 때만 다시 잰다. 스크롤로 주소창이 접혀도 장이 출렁이지 않아야 한다. → Task 12 `useStableViewportHeight` 테스트.
2. **가려진 간지에 키보드 초점이 들어가는 것** — 맨 위 장 말고는 모두 `inert` + `aria-hidden`. 넘긴 뒤 새 맨 위 장으로 바뀐다. → Task 7 테스트.
3. **넘기는 중 연타·한 장뿐인 묶음** — 넘김 중 "다음"은 무시, 한 장이면 "다음"이 비활성. → Task 7 테스트.
4. **간지 위 세로 스크롤·탭** — 세로 움직임이 먼저면 스크롤에 양보, 끌어 넘긴 뒤 따라오는 클릭은 막지만 그냥 탭한 링크는 열린다. → Task 6 `classifyDrag` 테스트 + Task 8 실기기 손 넘김(미검증이면 PR에 명시).
5. **옛 화면이 새 틀 안에서 깨지는 것** — 화면 이전 전이라 모든 앱 화면이 `plain` 틀로 들어간다. 탭 바(높이 64 + 10 + 안전 영역)가 옛 화면 하단 버튼을 가리지 않아야 한다. → Task 11 본문 여백 + Task 14 검증 목록(오늘·책장·소셜·프로필을 로그인 상태로 사용자 확인).

---

## PR ① 색·글자·괘선

### Task 1: 색 토큰

**Files:**
- Modify: `app/globals.css` (`:root`와 다크 블록)
- Modify: `tailwind.config.js` (`colors`)
- Modify: `app/layout.tsx` (`viewport.themeColor`)
- Modify: `public/manifest.json` (`background_color`, `theme_color`)
- Test: `lib/design/__tests__/tokens.test.ts`

**Interfaces:**
- Produces: CSS 변수 `--margin`, `--sheet`, `--sheet-alpha`, `--flag-{yellow,pink,orange,green,blue,purple}`; Tailwind 색 `margin`, `sheet`, `flag.{yellow,pink,orange,green,blue,purple}`; 테스트 도우미 `readTokens(mode: 'light' | 'dark'): Record<string, string>`(테스트 파일 안).

- [ ] **Step 1: 실패하는 테스트**

`readTokens`는 `app/globals.css`를 읽어 첫 `:root { … }`(light)와 `@media (prefers-color-scheme: dark) { :root { … } }`(dark)에서 `--이름: 값;`을 모은다(주석 제거, 값은 공백 정규화).

```ts
it.each([
  ['paper', '244 240 232', '26 23 20'],
  ['ink', '34 30 26', '236 229 218'],
  ['ink-sub', '107 100 90', '177 168 153'],
  ['ink-faint', '158 150 138', '142 132 118'], // 다크는 현행 유지
  ['hairline', '224 217 204', '46 42 37'],
  ['accent', '45 95 184', '133 169 236'], // 다크는 현행 유지
  ['margin', '142 169 221', '79 102 148'],
  ['sheet', '251 250 246', '38 35 31'],
  ['sheet-alpha', '0.62', '0.74'],
])('%s 토큰은 시안 값이다', (name, light, dark) => {
  expect(readTokens('light')[`--${name}`]).toBe(light);
  expect(readTokens('dark')[`--${name}`]).toBe(dark);
});

it('플래그 여섯 색은 라이트·다크 같은 값이다', () => {
  const flags = { yellow: '242 201 76', pink: '238 122 154', orange: '242 150 72',
    green: '104 190 132', blue: '92 140 232', purple: '156 128 214' };
  for (const [k, v] of Object.entries(flags)) {
    expect(readTokens('light')[`--flag-${k}`]).toBe(v);
    expect(readTokens('dark')[`--flag-${k}`] ?? v).toBe(v);
  }
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run lib/design/__tests__/tokens.test.ts` → paper 등 FAIL.

- [ ] **Step 3: 값 바꾸기**

`globals.css`: 위 표의 값으로 교체·추가. 각 줄 주석에 hex를 적는다(기존 형식). `card`·`card-raised`·`ink-invert`·`hairline-strong`·`accent-hover`·`danger`·`success`는 **그대로**(시안 대응 없음, 6절 9에서 정리). 플래그는 `:root`에만 두고, 다크에서 "알파 .5 + 안쪽 테두리"는 플래그 부품(4.1, 이번 범위 밖)이 쓴다는 주석을 남긴다.
`tailwind.config.js`: `margin: 'rgb(var(--margin) / <alpha-value>)'`, `sheet: 'rgb(var(--sheet) / <alpha-value>)'`, `flag: { yellow: 'rgb(var(--flag-yellow) / <alpha-value>)', … }`.
`layout.tsx` themeColor: 라이트 `#F4F0E8`, 다크 `#1A1714`. `manifest.json` 두 색: `#F4F0E8`.

- [ ] **Step 4: 통과 확인** — 같은 명령 PASS. `grep -rn "F7F3EC\|1B1612" app components lib public` → 결과 없음(문서 제외).

- [ ] **Step 5: 커밋** — `feat: 종이와 먹의 색이 새 일기장 시안의 색으로 바뀐다`

### Task 2: 글자 토큰과 버튼·입력 크기

**Files:**
- Modify: `tailwind.config.js` (`fontSize`)
- Modify: `components/ui/Button.tsx` (크기별 높이·여백)
- Modify: `components/ui/Input.tsx` (`line` 변형 높이)
- Test: `lib/design/__tests__/tokens.test.ts` (추가)

**Interfaces:**
- Produces: Tailwind 글자 토큰 `text-page-title`, `text-page-title-lg`, `text-section-title`, `text-quote`, `text-quote-lg`, `text-note`, `text-body`, `text-body-sm`, `text-input`, `text-button`, `text-button-sm`, `text-button-lg`, `text-caption`, `text-overline`, `text-tab`, `text-fine`. `Button` 크기 `sm`(40px)·`md`(48px)·`lg`(48px).

스펙 8절의 "본문·버튼·입력 크기 표"를 시안 `app.css`에서 잰 값으로 여기서 확정한다.

| 토큰 | 크기 / 줄 높이 / 굵기 | 시안 근거 |
| ---- | --------------------- | --------- |
| `page-title` | 34px / 1.15 / 700, 자간 -0.01em | `.large-title` |
| `page-title-lg` (새) | 40px / 1.15 / 700, -0.01em | 데스크톱 `.large-title` |
| `section-title` | 26px / 1.3 / 700, -0.01em | `.h2` |
| `quote` | 25px / 1.6 / 600, -0.01em | `.quote` |
| `quote-lg` (새) | 30px / 1.55 / 600, -0.015em | `.quote-lg` |
| `note` | 19px / 1.65 / 400 | `.note`, `.longf textarea` |
| `body` | 17px / 1.6 / 400 | `.lrow`, `.link` |
| `body-sm` | 15px / 1.5 / 400 | `.toast`, 보조 문장 |
| `input` | 18px / 1.5 | `.field input` |
| `button` | 17px / 1.25 / 600 | `.btn` |
| `button-sm` | 15px / 1.25 / 600 | `.btn.sm` |
| `button-lg` | 17px / 1.25 / 600 | 시안에 큰 버튼 없음 — `button`과 같게, 6절 9 정리 후보 |
| `caption` | 15px / 1.4 / 500 | `.meta` |
| `overline` | 14px / 1.4 / 600, 자간 없음 | `.label` |
| `tab` (새) | 12px / 1 / 600 | `.tab` |
| `fine` (새) | 13px / 1.5 / 500 | `.field .hint`, 묶음 위치 표시 |

`seal`·`ornament`·`display*`·`quote-mark`·`monogram`은 그대로. 서체(부리/산세리프)는 토큰이 아니라 요소의 `font-serif`/`font-sans`가 정한다.

- [ ] **Step 1: 실패하는 테스트** — `tailwind.config.js`를 `require`해 `theme.extend.fontSize`를 읽는다.

```ts
it.each([
  ['page-title', '2.125rem', '1.15', '700'],
  ['page-title-lg', '2.5rem', '1.15', '700'],
  ['section-title', '1.625rem', '1.3', '700'],
  ['quote', '1.5625rem', '1.6', '600'],
  ['quote-lg', '1.875rem', '1.55', '600'],
  ['note', '1.1875rem', '1.65', '400'],
  ['body', '1.0625rem', '1.6', '400'],
  ['input', '1.125rem', '1.5', undefined],
  ['button', '1.0625rem', '1.25', '600'],
  ['button-sm', '0.9375rem', '1.25', '600'],
  ['caption', '0.9375rem', '1.4', '500'],
  ['overline', '0.875rem', '1.4', '600'],
  ['tab', '0.75rem', '1', '600'],
  ['fine', '0.8125rem', '1.5', '500'],
])('%s 글자는 시안 크기다', (name, size, lh, weight) => {
  const [s, o] = fontSize[name];
  expect(s).toBe(size);
  expect(o.lineHeight).toBe(lh);
  expect(o.fontWeight).toBe(weight);
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run lib/design/__tests__/tokens.test.ts` → FAIL.
- [ ] **Step 3: `tailwind.config.js` 값 교체** — 위 표대로. 자간이 있는 항목은 `letterSpacing`.
- [ ] **Step 4: `Button` 높이** — `sm`: `min-h-10 px-4 text-button-sm`, `md`: `min-h-12 px-[22px] text-button`, `lg`: `min-h-12 px-[22px] text-button-lg`. 알약형·눌림 `scale(0.97)`·variant는 그대로. `Input variant="line"`: `min-h-12 text-input`(밑줄 색만 포커스 시 accent, 그대로).
- [ ] **Step 5: 통과 확인** — `npm test` PASS, `npm run lint` 오류 없음.
- [ ] **Step 6: 커밋** — `feat: 문장·생각·버튼 글자가 시안처럼 커진다`

### Task 3: 일기장 괘선

**Files:**
- Create: `lib/shell/routes.ts`
- Create: `components/ui/RuledPaper.tsx`
- Modify: `app/globals.css` (괘선 클래스)
- Modify: `components/AppShell.tsx` (괘선 마운트, 본문을 괘선 위로)
- Test: `lib/shell/__tests__/routes.test.ts`

**Interfaces:**
- Produces: `type Frame = 'leaves' | 'feed' | 'plain' | 'bare' | 'landing'`; `frameFor(pathname: string): Frame`; `LEAVES_ROUTES: readonly string[]`(초기 빈 배열, 화면 PR이 추가); `ruledFor(frame: Frame): 'margin' | 'plain' | null`; `<RuledPaper variant: 'margin' | 'plain'; besideSidebar?: boolean />`.

규칙: `/` → `landing`. 아래 접두사(정확한 경계: 같은 경로 또는 `접두사/…`) → `bare`: `/login`, `/signup`, `/onboarding`, `/auth`, `/reset-password`, `/update-password`, `/share`, `/invite`, `/privacy`, `/terms`, `/email`. `LEAVES_ROUTES`에 맞으면 `leaves`. 그 밖은 `plain`. (`feed`는 소셜 이전 PR이 쓴다.) `ruledFor`: leaves·feed → `margin`, plain·bare → `plain`, landing → `null`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it.each([
  ['/', 'landing'], ['/login', 'bare'], ['/share/e/abc', 'bare'], ['/invite/x', 'bare'],
  ['/privacy', 'bare'], ['/today', 'plain'], ['/books/1', 'plain'], ['/sharing', 'plain'],
])('%s의 틀은 %s', (p, f) => expect(frameFor(p)).toBe(f));
it('틀마다 괘선', () => {
  expect(ruledFor('leaves')).toBe('margin');
  expect(ruledFor('feed')).toBe('margin');
  expect(ruledFor('plain')).toBe('plain');
  expect(ruledFor('bare')).toBe('plain');
  expect(ruledFor('landing')).toBeNull();
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run lib/shell/__tests__/routes.test.ts` → FAIL(모듈 없음).
- [ ] **Step 3: `lib/shell/routes.ts` 구현.**
- [ ] **Step 4: 괘선 CSS** (`globals.css`, 시안 "일기장 괘선" 그대로, 색은 토큰)

```css
.diary-ruled { position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    linear-gradient(to right, transparent 51px, rgb(var(--margin)) 51px, rgb(var(--margin)) 52px, transparent 52px),
    repeating-linear-gradient(to bottom, transparent 0 39px, rgb(var(--hairline)) 39px 40px);
  background-position: 0 0, 0 18px; }
.diary-ruled--plain { background: repeating-linear-gradient(to bottom, transparent 0 39px, rgb(var(--hairline)) 39px 40px);
  background-position: 0 18px; }
@media (min-width: 1024px) {
  .diary-ruled--beside-sidebar { left: var(--app-side); }
  .diary-ruled--beside-sidebar:not(.diary-ruled--plain) { background-position: -20px 0, 0 18px; }
}
```

`--app-side`는 Task 11에서 정의한다(그 전에는 `besideSidebar`를 쓰지 않는다).

- [ ] **Step 5: `RuledPaper`와 마운트** — `<div aria-hidden className=…/>`. `AppShell`에서 `ruledFor(frameFor(pathname))`가 null이 아니면 `main` 앞에 렌더하고, `main`에 `relative z-[1]`을 더한다. 이 PR에서는 `BARE_PREFIXES`·내비 표시 로직을 바꾸지 않는다(Task 11에서 `frameFor`로 교체).
- [ ] **Step 6: 통과 확인** — `npm test` PASS.
- [ ] **Step 7: 커밋** — `feat: 화면 뒤에 일기장 괘선이 깔린다`

### Task 4: 문서와 PR ①

**Files:**
- Create: `DESIGN.md`
- Modify: `docs/ui-guidelines.md`, `AGENTS.md`(Design Context), `PRODUCT.md`(Brand Commitments 마지막 줄)
- Add: `docs/superpowers/plans/2026-10-22-redesign-foundation.md`(이 계획)

역할을 나눠 같은 표가 세 곳에 복제되지 않게 한다.

- `docs/ui-guidelines.md` — **규범의 원본.** 제목 "일기장과 간지". 원칙 한 줄: "문장이 주인공. 책의 목소리는 부리, 나의 도구는 산세리프. 깊이는 간지에만, 나머지는 헤어라인. 파랑은 잉크처럼 아껴서." 색 표(Task 1 값, 새 토큰 `margin`·`sheet`·`flag-*` 포함, 다크 예외 두 개 명시, `card`·`card-raised`는 "이전 중, 6절 9 정리"), 글자 표(Task 2 표), "바탕" 절(괘선·여백선, 도구 화면은 괘선만, `frameFor` 표). 표면 규칙의 "그림자 금지"를 "깊이는 간지에만"으로 바꾼다. 옛 화면 전용 절(끼움 쪽지, 프로필 책, 엽서, 책장 넘김 3D, 한 주의 독서 편지 등)은 지우지 말고 `## 옛 화면 규칙 (화면 이전 중)` 아래로 옮기고 "해당 화면 PR에서 새 규칙으로 바꾸거나 지운다"를 적는다.
- `DESIGN.md`(새, 루트) — 디자인 도구와 사람이 처음 읽는 한 장 요약: 정체성(일기장 괘선 위에 겹친 트레이싱지 간지, Apple식 바), 재질 세 가지(종이·간지·바), 하지 않기로 한 것(시안 README "하지 않기로 한 것" 그대로), 근거 링크(스펙, 시안 README, ui-guidelines). 값 표는 넣지 않고 ui-guidelines로 링크한다.
- `AGENTS.md` Design Context — 제목을 "일기장과 간지"로, 원칙 한 줄을 위와 같게. "색과 서체"·"표면과 상호작용 문법"을 새 규칙으로 갱신(색 값 hex는 accent 확정값만 남기고 나머지는 ui-guidelines 링크). 책 상세 "원고 흐름"·"책등 서가, 펼치는 책, 발췌집, 소셜 엽서, 프로필 책은 제품의 특징" 문장은 스펙 2.7(사라지는 것: 프로필 3D 책·엽서·책장 3D 넘김)에 맞게 고친다. "현재 문서와 구현의 차이"를 2026-10-22 기준으로 다시 쓴다: 그림자 예외 항목 → "간지 외 그림자(옛 3D 책·엽서)는 화면 이전 중 남아 있음", ink-faint 다크 차이 → 해소(문서도 #8E8476), `redesign` 브랜치에서 화면 이전 중이라는 사실.
- `PRODUCT.md` — "시각 체계의 현재 기준은 …" 줄에 `DESIGN.md`를 더한다.

- [ ] **Step 1: 문서 갱신.**
- [ ] **Step 2: 문서 검사** — 바꾼 문서의 상대 링크가 실제 파일을 가리키는지 확인(`grep -o '](\([^)]*\))'`로 뽑아 `ls`), `npx prettier --check DESIGN.md AGENTS.md PRODUCT.md docs/ui-guidelines.md`.
- [ ] **Step 3: 전체 검사** — `npm test`, `npm run lint`, `npm run build` 모두 통과.
- [ ] **Step 4: 커밋** — `docs: 새 디자인의 색·글자·괘선 규칙을 기록한다`(계획 파일 커밋은 맨 앞에 별도로).
- [ ] **Step 5: push와 미리보기 확인** — `git push -u origin feat/redesign-tokens`. Vercel MCP `list_deployments`(projectId `prj_vXzdIUGCtZf362pxl9QJwGhIyTlk`, teamId `team_V8OHzGB2ZuEVtZx7Asil3uVF`, branch)로 READY 확인, 공유 링크로 Playwright를 열어 `/login`을 390×844·1440×900, 라이트·다크(`emulateMedia colorScheme`)로 스크린숏. 확인할 것: 바탕 `#F4F0E8`/`#1A1714`, 괘선이 40px 간격으로 보이고 여백선은 없음(bare), 버튼 높이 48px.
- [ ] **Step 6: Draft PR** — `gh pr create --draft --base redesign`. 제목 예: `feat: 새 일기장의 종이·먹 색과 큰 글자, 괘선 바탕이 깔린다`. 본문(무엇이 달라지나요 / 어떻게 바꾸었나요 / 확인한 내용): 옛 화면이 아직 남아 있어 미리보기에서 글자가 커진 옛 화면이 보인다는 사실, 스펙 8절 크기 표를 확정한 근거, 로그인 화면 외는 사용자 확인 필요.

---

## PR ② 간지 재질과 간지 묶음

### Task 5: 간지 재질

**Files:**
- Modify: `app/globals.css` (`--grain`, `--vellum-light`, `.vellum`, `.vellum-slip`, `overflow-x: clip`)
- Modify: `app/layout.tsx` (body의 `overflow-x-hidden` 제거)

**Interfaces:**
- Produces: 클래스 `.vellum`(한 장의 간지 — 시안 `.sheet` 최종본), `.vellum-slip`(묶음 안 간지 — 시안 `.lslip`의 재질 부분만).

- [ ] **Step 1: 변수** — 시안 `app.css` "간지 재질" 블록의 `--grain`(라이트·다크 두 SVG)과 `--vellum-light`(라이트·다크 그라디언트)를 `:root`와 다크 블록에 그대로 옮긴다.
- [ ] **Step 2: `.vellum`** — 시안 값 그대로:
  - 라이트: `background-color: rgb(var(--sheet) / var(--sheet-alpha)); background-image: var(--grain), var(--vellum-light); backdrop-filter: blur(3px) saturate(.8) brightness(1.02)`(+ `-webkit-`); `box-shadow: inset 0 0 0 1px rgb(255 255 255/.55), 0 1px 1px rgb(60 45 25/.05), 0 12px 26px -20px rgb(60 45 25/.3)`.
  - 다크: `backdrop-filter: blur(3px) saturate(.7)`; `box-shadow: inset 0 .5px 0 rgb(255 255 255/.1), inset 0 0 0 .5px rgb(255 255 255/.05), 0 16px 32px -20px rgb(0 0 0/.65)`.
  - 투명도 줄이기: `background: rgb(var(--sheet)) !important; backdrop-filter: none`.
- [ ] **Step 3: `.vellum-slip`** — 시안 `.lslip`의 배경·필터·그림자(라이트 `rgb(var(--sheet)/.66)`, blur 1.6px saturate .8, 다크 `.72`와 다크 그림자), `border-radius: 2px`, `padding: 16px 18px 18px`, 투명도 줄이기 불투명. 자리·transform·transition은 Task 7의 `Pile`이 맡는다.
- [ ] **Step 4: 가로 넘침** — `html, body { overflow-x: clip; }`를 추가하고 `layout.tsx` body의 `overflow-x-hidden`을 뺀다(hidden은 스크롤 상자를 만들어 sticky·scroll-snap을 깬다). `body { overscroll-behavior: none }`도 시안처럼 `html, body`에 둔다.
- [ ] **Step 5: 확인** — `npm run build` 통과. (눈 확인은 Task 8 견본 화면에서.)
- [ ] **Step 6: 커밋** — `feat: 반투명 트레이싱지 간지 재질을 쓸 수 있다`

### Task 6: 간지 묶음 계산

**Files:**
- Create: `lib/pile/geometry.ts`
- Test: `lib/pile/__tests__/geometry.test.ts`

**Interfaces:**
- Produces:
  - 상수 `SLOT = [[0,0],[16,15],[32,30],[48,45]]`, `MID = [40,37]`, `TILT = [.22,.7,.85,1]`, `TILT_MID = .9`, `FLIP_MS = 560`, `FLIP_TURN = .38`, `SETTLE_MS = 300`, `REDUCED_MS = 160`, `EASE_FLIP_OUT = 'cubic-bezier(.33,1,.68,1)'`, `EASE_FLIP_BACK = 'cubic-bezier(.65,0,.35,1)'`.
  - `type Pose = { t: number; jx: number; jy: number }`
  - `type Placement = { x: number; y: number; r: number; z: number; hidden: boolean; top: boolean }`
  - `randomTilt(away: number, rnd: () => number): number` — 부호: `away`가 0이 아니면 `-Math.sign(away)`, 0이면 `rnd() < .5 ? -1 : 1`; 크기 `1.3 + rnd() * 1.9`; 소수 둘째 자리 반올림.
  - `randomJitter(rnd: () => number): number` — `Math.round((rnd() * 2 - 1) * 4)`.
  - `placeSlips(poses: Pose[]): Placement[]` — `poses`는 **아래→위** 순서. 시안 `lay()` 그대로(아래 코드).
  - `awayIndexForBack(n: number): number` — 뒤로 들어갈 장이 반대로 기울 기준 장의 인덱스: `n > 4 ? n - 4 : 0`(순서 바꾸기 **전** 배열 기준).
  - `pileMarginBottom(n: number): number` — `Math.min(n - 1, 3) * 15 + 10`.
  - `flipOutX(slotLeft: number, nextRight: number, viewportWidth: number): number` — `Math.round(Math.min(nextRight + 10, viewportWidth - 48) - slotLeft)`.
  - `flipKeyframes(from: Placement, ox: number, to: Placement): Keyframe[]` — 세 키프레임: `from`의 transform(+ `easing: EASE_FLIP_OUT`), `offset: FLIP_TURN`에서 `translate(${ox}px,-8px) rotate(3deg) scale(.985)`(+ `easing: EASE_FLIP_BACK`), `to`의 transform.
  - `slipTransform(p: Placement): string` — `translate(${x}px,${y}px) rotate(${r}deg)`.
  - `dragLimit(viewportWidth: number, slipRight: number): number` — `Math.max(20, viewportWidth - 8 - slipRight)`.
  - `dragOffset(mx: number, lim: number): number` — `mx > 0 ? lim * (1 - Math.exp(-mx / lim)) : -Math.min(16, -mx * .2)`.
  - `shouldFlip(dx: number, lim: number, elapsedMs: number): boolean` — `dx > lim * .45 || dx / elapsedMs > .11`.
  - `classifyDrag(mx: number, my: number): 'pending' | 'scroll' | 'drag'` — `|my| > |mx| && |my| > 6` → `scroll`; `|mx| < 6` → `pending`; 그 밖 `drag`.

`placeSlips` 본문(시안 `lay()`의 정확한 이식이라 그대로 둔다):

```ts
export function placeSlips(poses: Pose[]): Placement[] {
  const n = poses.length;
  return poses.map((p, i) => {
    const d = n - 1 - i;
    const hidden = n > 4 && d > 2 && i > 0;
    const k = n > 4 && i === 0 ? 3 : Math.min(d, 3);
    const [x, y] = hidden ? MID : SLOT[k];
    const f = hidden ? TILT_MID : TILT[k];
    const j = k && !hidden ? 1 : 0;
    return { x: x + j * p.jx, y: y + j * p.jy, r: +(p.t * f).toFixed(2), z: i + 1, hidden, top: i === n - 1 };
  });
}
```

- [ ] **Step 1: 실패하는 테스트**

```ts
const P = (t: number, jx = 2, jy = -3): Pose => ({ t, jx, jy });
it('한 장이면 제자리, 거의 수평', () => {
  expect(placeSlips([P(2)])).toEqual([{ x: 0, y: 0, r: 0.44, z: 1, hidden: false, top: true }]);
});
it('다섯 장이면 맨 아래는 넷째 자리, 사이 한 장은 숨긴 자리', () => {
  const r = placeSlips([P(2), P(-2), P(2), P(-2), P(2)]);
  expect(r[0]).toMatchObject({ x: 50, y: 42, r: 2, hidden: false });
  expect(r[1]).toMatchObject({ x: 40, y: 37, r: -1.8, hidden: true });
  expect(r[2]).toMatchObject({ x: 34, y: 27, r: 1.7, hidden: false });
  expect(r[3]).toMatchObject({ x: 18, y: 12, r: -1.4, hidden: false });
  expect(r[4]).toMatchObject({ x: 0, y: 0, r: 0.44, top: true });
});
it('기울기는 기준 장과 반대, 1.3~3.2도', () => {
  expect(randomTilt(2, () => 0)).toBe(-1.3);
  expect(randomTilt(-2, () => 0.999999)).toBe(3.2);
  expect(randomTilt(0, () => 0.4)).toBeLessThan(0);
});
it('지터는 ±4px 정수', () => {
  expect(randomJitter(() => 0)).toBe(-4);
  expect(randomJitter(() => 0.999999)).toBe(4);
});
it('뒤로 넣을 장의 기준', () => { expect(awayIndexForBack(3)).toBe(0); expect(awayIndexForBack(7)).toBe(3); });
it('아래 자리 여백', () => { expect(pileMarginBottom(1)).toBe(10); expect(pileMarginBottom(9)).toBe(55); });
it('빼는 거리: 다음 장 너머, 최소 48px는 화면에', () => {
  expect(flipOutX(24, 300, 390)).toBe(286);
  expect(flipOutX(24, 380, 390)).toBe(318);
});
it('넘김 키프레임', () => {
  const k = flipKeyframes({ x: 0, y: 0, r: .4, z: 5, hidden: false, top: true }, 286, { x: 50, y: 42, r: 2, z: 1, hidden: false, top: false });
  expect(k).toEqual([
    { transform: 'translate(0px,0px) rotate(0.4deg)', easing: 'cubic-bezier(.33,1,.68,1)' },
    { transform: 'translate(286px,-8px) rotate(3deg) scale(.985)', offset: 0.38, easing: 'cubic-bezier(.65,0,.35,1)' },
    { transform: 'translate(50px,42px) rotate(2deg)' },
  ]);
});
it('끌기: 한계에 가까울수록 무겁고 왼쪽은 16px까지', () => {
  expect(dragOffset(100, 100)).toBeCloseTo(63.21, 2);
  expect(dragOffset(-200, 100)).toBe(-16);
});
it('넘김 판정: 한계의 45% 또는 0.11px/ms', () => {
  expect(shouldFlip(46, 100, 1000)).toBe(true);
  expect(shouldFlip(30, 100, 200)).toBe(true);
  expect(shouldFlip(30, 100, 1000)).toBe(false);
});
it('세로가 먼저면 스크롤', () => {
  expect(classifyDrag(3, 10)).toBe('scroll');
  expect(classifyDrag(4, 2)).toBe('pending');
  expect(classifyDrag(10, 4)).toBe('drag');
});
it('끌기 한계', () => { expect(dragLimit(390, 380)).toBe(20); expect(dragLimit(390, 300)).toBe(82); });
```

- [ ] **Step 2: 실패 확인** — `npx vitest run lib/pile/__tests__/geometry.test.ts` → FAIL.
- [ ] **Step 3: 구현** — 위 시그니처대로.
- [ ] **Step 4: 통과 확인** — PASS.
- [ ] **Step 5: 커밋** — `feat: 간지 묶음의 자리와 넘김 거리를 시안 값으로 계산한다`

### Task 7: `Pile` 컴포넌트

**Files:**
- Create: `components/ui/Pile.tsx`
- Test: `components/ui/__tests__/pile.test.ts`

**Interfaces:**
- Consumes: Task 6 전부, `.vellum-slip`(Task 5).
- Produces:

```ts
interface PileHeaderProps { position: string; next: () => void; canNext: boolean; nextLabel: string }
interface PileProps<T> {
  items: T[];                       // items[0]이 처음 맨 위
  getKey: (item: T) => string;
  renderSlip: (item: T, state: { isTop: boolean }) => React.ReactNode;
  label: string;                    // 묶음 그룹의 aria-label
  nextLabel?: string;               // 기본 '다음'
  getName?: (item: T) => string;    // 위치 표시 앞에 붙는 이름(예: '10월')
  renderHeader?: (h: PileHeaderProps) => React.ReactNode;  // 없으면 기본 머리
  className?: string;
}
export default function Pile<T>(props: PileProps<T>): JSX.Element
```

동작(스펙 2.4):

- 상태: `order: string[]`(아래→위 키), `poses: Record<key, Pose>`, `busy`. 처음 포즈는 위에서 아래로 바로 위 장과 반대로 기울게 `randomTilt(prev, Math.random)`.
- **DOM 순서는 `items` 순서로 고정**하고 쌓임은 `z-index`로만 표현한다. 순서 바꾸기가 DOM을 옮기지 않으므로 나머지 장의 transform transition이 끊기지 않는다(스펙의 "React 재배치로 transition이 끊긴다" 문제를 피하는 방식 — PR 본문에 적는다).
- 각 장: `grid-area: 1/1; width: calc(100% - 52px)`, `transform: slipTransform(placement)`, `transition: transform 320ms var(--ease-out), opacity 200ms ease`, `touch-action: pan-y`, `user-select: none`, 숨김 장 `opacity: 0`, 맨 위가 아닌 장은 `inert` + `aria-hidden="true"`. 묶음 `margin-bottom: pileMarginBottom(n)px`.
- 위치 표시: 맨 위 장의 `items` 인덱스+1 `/` n, `getName`이 있으면 `이름 · ` 접두. `aria-live="polite"`. 기본 머리: 위치(`font-mono text-fine text-ink-sub`) + 링크 버튼(`text-button-sm text-accent min-h-10`, 문구 `nextLabel`, n<2이면 `disabled`).
- `next()`(버튼·끌기 공통): n<2 또는 busy면 무시.
  - 동작 줄이기(`matchMedia('(prefers-reduced-motion: reduce)')`): 맨 위를 맨 아래로, 새 포즈, 새 맨 위 장에 `animate([{opacity:.4},{opacity:1}], {duration: REDUCED_MS, easing: 'ease'})`.
  - 보통: busy=true. 넘길 장 포즈를 `randomTilt(poses[order[awayIndexForBack(n)]].t)`로 새로 정하고, 순서 바꾼 뒤의 `placeSlips(...)[0]`을 끝 자리로 `flipKeyframes`를 만든다. `slotLeft = rect.left - placement.x`, `nextRight` = 바로 아래 장 `getBoundingClientRect().right`, `ox = flipOutX(slotLeft, nextRight, innerWidth)`. 넘기는 장의 transition을 끄고 `el.animate(keyframes, { duration: FLIP_MS })`. `setTimeout(FLIP_MS * FLIP_TURN)`에 나머지 장 transition 시간을 `SETTLE_MS`로 두고 순서 상태를 바꾼다. `onfinish`에서 transition 복원, busy=false.
- 손으로 밀기: 맨 위 장의 `pointerdown`(주 버튼만)에서 시작, `window`의 pointermove/up/cancel. `classifyDrag`로 `scroll`이면 즉시 끝(되돌림), `drag`가 되면 `setPointerCapture`·`drag` 상태. 움직임: `dragOffset(mx, dragLimit(innerWidth, 시작 rect.right))`, 동작 줄이기가 아니면 `translate(${dx}px, ${-|dx|*.08}px) rotate(${r + dx*.06}deg)`. 놓을 때 `shouldFlip`이면 `next()`, 아니면 제자리. 끌기였으면 그 장의 다음 click을 capture 단계에서 `preventDefault`(once).
- 언마운트 시 타이머 정리.

- [ ] **Step 1: 실패하는 테스트** (`// @vitest-environment jsdom`, 파일 머리에서 `HTMLElement.prototype.animate`를 `{ onfinish: null, cancel() {} }`를 돌려주는 가짜로, `window.matchMedia`를 제어 가능한 가짜로 둔다)

```ts
const items = ['가', '나', '다', '라', '마'];
const renderPile = (list = items) => render(React.createElement(Pile<string>, {
  items: list, getKey: (s) => s, label: '덧붙인 생각 묶음',
  renderSlip: (s) => React.createElement('a', { href: `#${s}` }, s),
}));
it('맨 위 장만 초점을 받는다', () => {
  renderPile();
  expect(screen.getByText('가').closest('[inert]')).toBeNull();
  for (const s of ['나', '다', '라', '마']) expect(screen.getByText(s).closest('[inert]')).not.toBeNull();
  expect(screen.getByText('1/5')).toBeTruthy();
});
it('동작 줄이기에서 다음을 누르면 바로 다음 장이 맨 위', () => {
  reduceMotion(true); renderPile();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(screen.getByText('2/5')).toBeTruthy();
  expect(screen.getByText('가').closest('[inert]')).not.toBeNull();
  expect(screen.getByText('나').closest('[inert]')).toBeNull();
});
it('넘기는 중에는 다음을 받지 않는다', () => {
  reduceMotion(false); vi.useFakeTimers(); renderPile();
  const next = screen.getByRole('button', { name: '다음' });
  fireEvent.click(next); fireEvent.click(next);
  act(() => vi.advanceTimersByTime(560 * 0.38));
  expect(screen.getByText('2/5')).toBeTruthy();
  fireEvent.click(next); act(() => vi.advanceTimersByTime(560));
  expect(screen.getByText('2/5')).toBeTruthy();       // onfinish 전
  act(() => lastAnimation().onfinish?.());
  fireEvent.click(next); act(() => vi.advanceTimersByTime(560 * 0.38));
  expect(screen.getByText('3/5')).toBeTruthy();
});
it('한 장이면 다음이 비활성', () => {
  renderPile(['가']);
  expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true);
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run components/ui/__tests__/pile.test.ts` → FAIL.
- [ ] **Step 3: 구현.**
- [ ] **Step 4: 통과 확인** — PASS, `npm run lint` 통과.
- [ ] **Step 5: 커밋** — `feat: 간지 묶음을 옆으로 밀어 다음 장을 꺼낼 수 있다`

### Task 8: 견본 화면과 PR ②

**Files:**
- Create: `app/design-lab/page.tsx`
- Modify: `docs/ui-guidelines.md`(간지·간지 묶음 절), `DESIGN.md`(재질 문장 확인만)

**Interfaces:**
- Consumes: 토큰(Task 1–2), `RuledPaper`(Task 3), `.vellum`(Task 5), `Pile`(Task 7).
- Produces: 주소 `/design-lab` — Task 14가 같은 화면에 화면 틀 견본을 덧붙인다.

- [ ] **Step 1: 견본 화면** — 서버 컴포넌트에서 `if (process.env.VERCEL_ENV === 'production') notFound();`. 내용: 색 견본(토큰 이름·값), 글자 견본(Task 2 표의 각 토큰으로 같은 한국어 문장), 버튼 sm/md, `Input line`, `.vellum` 한 장(시안 home2의 회상 간지 문구), `Pile` 하나(시안 entry-layer의 덧붙인 생각 문구 5장, `nextLabel='다음 생각'`). 데이터 조회 없음, 예시 문구는 시안 HTML에서 가져온다. 이 화면은 6절 9(`redesign` → `main`) 전에 지운다 — 파일 머리 주석에 적는다.
- [ ] **Step 2: 문서** — ui-guidelines에 "간지" 절(쓰는 곳 목록, 재질 값의 원본은 `globals.css` `.vellum`, 투명도 줄이기)과 "간지 묶음" 절(`Pile` 사용법, 위치 표시·다음 버튼 필수, 동작 값은 `lib/pile/geometry.ts`)을 더한다.
- [ ] **Step 3: 검사** — `npm test`, `npm run lint`, `npm run build`.
- [ ] **Step 4: 미리보기 검증** — push 후 미리보기 `/design-lab`을 Playwright로:
  - 390×844·1180×820·1440×900 × 라이트·다크 스크린숏. 시안(`python3 -m http.server 8765`를 저장소 루트에서, `docs/design/concept-2026-10/entry-layer.html`)과 같은 폭에서 나란히 비교: 간지 결·빛·그림자, 묶음 자리(16/15 간격), 기울기 범위.
  - 프레임 샘플링: "다음 생각"을 누르고 `requestAnimationFrame`마다 맨 위 장의 `getBoundingClientRect()`와 computed transform을 기록. 확인: 약 560ms에 끝남, 38% 근처에서 가장 멀리(오른쪽, 화면에 48px 이상 남음), 끝난 뒤 다음 프레임에 자리가 튀지 않음, 그동안 `document.documentElement.scrollWidth === innerWidth`.
  - 키보드: Tab으로 맨 위 장의 링크와 "다음 생각"만 도는지, Enter로 넘김.
  - `emulateMedia({ reducedMotion: 'reduce' })`: 이동 없이 순서만 바뀌고 흐림. 투명도 줄이기는 Playwright 미지원 → 미검증으로 적는다.
  - 실기기 손 넘김은 사용자 확인 항목으로 PR에 적는다.
- [ ] **Step 5: 커밋·push·Draft PR** — 제목 예: `feat: 트레이싱지 간지와 옆으로 밀어 넘기는 간지 묶음이 생긴다`. 본문에 견본 주소(미리보기 `/design-lab`), DOM 순서 고정 방식의 이유, 프레임 샘플링 수치를 적는다.

---

## PR ③ 화면 틀·장 넘김·바텀 시트

### Task 9: 탭과 틀 판정

**Files:**
- Modify: `lib/shell/routes.ts`
- Test: `lib/shell/__tests__/routes.test.ts`

**Interfaces:**
- Produces: `type TabKey = 'today' | 'books' | 'social' | 'me' | 'search' | 'bell'`; `NAV_TABS: readonly { key: 'today' | 'books' | 'social' | 'me'; href: string; label: string }[]` = 오늘 `/today`, 책장 `/books`, 소셜 `/social`, 나 `/profile`; `tabFor(pathname: string): TabKey | null`; `showsNav(frame: Frame, loggedIn: boolean, pathname: string): boolean`; `LEAVES_ROUTES`에 `/design-lab/leaves` 추가.

`tabFor` 규칙(시안 각 화면의 `data-tab`): `/social/notifications`·`/notifications/…` → `bell`; `/today`·`/entry/…`·`/pilsa` → `today`; `/books/…` → `books`; `/social/…` → `social`; `/profile/…`·`/settings/…` → `me`; `/search` → `search`; 그 밖 `null`. 경계는 Task 3과 같은 정확한 비교.
`showsNav`: `bare`·`landing`이면 false. 그 밖은 `loggedIn`이거나 `/design-lab` 경로(견본 확인용, 6절 9에서 제거 — 주석)일 때 true.

- [ ] **Step 1: 실패하는 테스트**

```ts
it.each([
  ['/today', 'today'], ['/entry/1', 'today'], ['/entry/1/edit', 'today'], ['/pilsa', 'today'],
  ['/books', 'books'], ['/books/1/excerpts', 'books'], ['/social', 'social'], ['/social/u/a', 'social'],
  ['/social/notifications', 'bell'], ['/notifications/inbox', 'bell'], ['/profile', 'me'],
  ['/settings', 'me'], ['/search', 'search'], ['/bookstore', null], ['/', null],
])('%s → %s', (p, t) => expect(tabFor(p)).toBe(t));
it('메뉴는 로그인한 앱 화면에서만', () => {
  expect(showsNav('plain', true, '/today')).toBe(true);
  expect(showsNav('plain', false, '/today')).toBe(false);
  expect(showsNav('bare', true, '/share/e/1')).toBe(false);
  expect(showsNav('landing', true, '/')).toBe(false);
  expect(showsNav('plain', false, '/design-lab')).toBe(true);
});
it('견본 장 넘김 화면은 leaves', () => expect(frameFor('/design-lab/leaves')).toBe('leaves'));
```

- [ ] **Step 2: 실패 확인** → FAIL. **Step 3: 구현.** **Step 4: PASS.**
- [ ] **Step 5: 커밋** — `feat: 지금 화면이 어느 탭인지 새 메뉴 기준으로 정한다`

### Task 10: 상단 바

**Files:**
- Create: `components/shell/TopBarContext.tsx`, `components/shell/TopBar.tsx`, `components/shell/LargeTitle.tsx`
- Modify: `app/globals.css`(바 재질)
- Test: `components/shell/__tests__/topbar.test.ts`

**Interfaces:**
- Produces:

```ts
interface TopBarConfig { title?: string; brand?: boolean; back?: { href: string; label: string }; actions?: React.ReactNode }
function TopBarProvider({ children }: { children: React.ReactNode }): JSX.Element
function useTopBar(config: TopBarConfig): void         // 마운트·변경 시 설정, 언마운트 시 기본값으로
function useTopBarState(): { config: TopBarConfig; scrolled: boolean; leafTitle: string | null;
  setScrolled(v: boolean): void; setLeafTitle(t: string | null): void }
function TopBar({ hasUnread }: { hasUnread: boolean }): JSX.Element   // lg 이상에서 숨김
function LargeTitle({ children }: { children: React.ReactNode }): JSX.Element  // h1 + 감지용 sentinel
```

- 기본 설정: `brand: true`, `title: ''`, 기본 동작 버튼 = 찾기(`/search`, aria-label "책과 기록 찾기", `Search`) + 알림(`/social/notifications`, `Bell`, 새 소식이면 accent 점 8px, `top:11px right:11px`, `box-shadow: 0 0 0 2px rgb(var(--paper))`, aria-label "알림, 새 소식 있음"/"알림").
- 모양(시안 `.navbar`): `fixed top-0 inset-x-0 z-30`, 높이 `var(--app-mobile-header-height)`, `padding: var(--app-safe-top) 10px 0 16px`, flex gap 2px. 브랜드 `font-serif` 700 22px. 뒤로: accent, 17px 400, `ChevronLeft` 24px strokeWidth 2.2, min-h 44. 가운데 제목: `absolute left-[70px] right-[70px] bottom-[14px]` 600 17px, 말줄임, 평소 opacity 0. 아이콘 버튼 44×44(아이콘 23px). 표시 제목 = `leafTitle ?? config.title`.
- 스크롤 재질(`.topbar--scrolled`): `background: rgb(var(--sheet)/.72); backdrop-filter: blur(20px) saturate(1.6); box-shadow: 0 .5px 0 rgb(0 0 0/.12)`; 브랜드 opacity 0, 제목 opacity 1. 전환 `background-color 200ms ease, box-shadow 200ms ease`, 글자 opacity 160ms. 투명도 줄이기에서 불투명.
- `LargeTitle`: `<div ref=sentinel aria-hidden />` + `<h1 className="text-page-title lg:text-page-title-lg font-sans">`. `IntersectionObserver`로 sentinel이 안 보이면 `setScrolled(true)`. 언마운트 시 false.

- [ ] **Step 1: 실패하는 테스트** (jsdom, `next/navigation`의 `usePathname` mock, `IntersectionObserver` 가짜를 두고 콜백을 직접 호출)

```ts
it('설정이 없으면 브랜드와 찾기·알림', () => {
  renderWithProvider(h(TopBar, { hasUnread: true }));
  expect(screen.getByText('Readiary')).toBeTruthy();
  expect(screen.getByRole('link', { name: '책과 기록 찾기' }).getAttribute('href')).toBe('/search');
  expect(screen.getByRole('link', { name: '알림, 새 소식 있음' }).getAttribute('href')).toBe('/social/notifications');
});
it('뒤로 링크와 제목을 화면이 정한다', () => {
  renderWithProvider(h(Fragment, null, h(Configure, { back: { href: '/today', label: '오늘' }, title: '찾기' }), h(TopBar, { hasUnread: false })));
  expect(screen.getByRole('link', { name: '오늘' }).getAttribute('href')).toBe('/today');
  expect(screen.queryByText('Readiary')).toBeNull();
  expect(screen.getByText('찾기')).toBeTruthy();
});
it('큰 제목이 가려지면 바가 간지 재질로 바뀐다', () => {
  renderWithProvider(h(Fragment, null, h(LargeTitle, null, '찾기'), h(TopBar, { hasUnread: false })));
  act(() => io.trigger({ isIntersecting: false }));
  expect(document.querySelector('.topbar--scrolled')).not.toBeNull();
});
```

(`Configure`는 테스트 안에서 `useTopBar(props)`만 부르는 컴포넌트.)

- [ ] **Step 2: FAIL 확인. Step 3: 구현. Step 4: PASS.**
- [ ] **Step 5: 커밋** — `feat: 스크롤하면 상단 바에 작은 제목과 간지 재질이 나타난다`

### Task 11: 탭 바·사이드바와 앱 셸 교체

**Files:**
- Create: `components/shell/TabBar.tsx`, `components/shell/Sidebar.tsx`, `components/shell/GuestBar.tsx`
- Modify: `components/AppShell.tsx`, `app/globals.css`(`--app-*` 변수, `.bar-material`), `app/layout.tsx`(없음 또는 import만)
- Delete: `components/Header.tsx`, `components/Navbar.tsx`
- Test: `components/shell/__tests__/tabbar.test.ts`

**Interfaces:**
- Consumes: `NAV_TABS`, `tabFor`, `frameFor`, `showsNav`, `ruledFor`(Task 3·9), `TopBarProvider`·`TopBar`(Task 10), `RuledPaper`.
- Produces: CSS 변수 `--app-mobile-header-height: calc(52px + var(--app-safe-top))`(이름 유지, 랜딩 `Slide`가 씀), `--app-tabbar-h: 64px`, `--app-mobile-nav-height: calc(var(--app-tabbar-h) + 10px + var(--app-safe-bottom))`, `--app-side: 248px`. `--app-mobile-nav-padding`은 삭제(쓰는 곳 Navbar뿐).

바 재질 `.bar-material`(탭 바·사이드바·Task 12의 장 전환 버튼 공용, 시안 값): 라이트 `box-shadow: inset 0 0 0 .5px rgb(255 255 255/.7), inset 0 1px 0 rgb(255 255 255/.6), 0 8px 28px -10px rgb(40 30 20/.35)`; 다크(시안 "밤의 유리") `inset 0 .5px 0 rgb(255 255 255/.09), inset 0 0 0 .5px rgb(0 0 0/.35), 0 14px 36px -12px rgb(0 0 0/.75)`; 투명도 줄이기 불투명. 배경·blur는 부품마다 다르다(아래).

- **TabBar**(lg 미만, `showsNav`일 때): `fixed left-4 right-4 z-30`, `bottom: calc(10px + var(--app-safe-bottom))`, 높이 `var(--app-tabbar-h)`, `rounded-[32px]`, `grid grid-cols-4 p-1`, 배경 `rgb(var(--sheet)/.62)`, `backdrop-filter: blur(22px) saturate(1.8)`. 탭: 세로 가운데, gap 2px, `rounded-[28px]`, `text-tab`, `text-ink-sub`, 아이콘 24px. 현재 탭: `text-accent`, 배경 `rgb(127 127 127/.12)`(다크 `rgb(255 255 255/.1)` — CSS의 다크 블록에서). 아이콘: 오늘 `NotebookPen`, 책장 `Library`, 소셜 `Users`, 나 `User`. `aria-current="page"`, `prefetch`. `nav aria-label="주요 메뉴"`.
- **Sidebar**(lg 이상, `showsNav`일 때): `fixed` `inset: 12px auto 12px 12px`, 폭 `calc(var(--app-side) - 24px)`, `rounded-[18px]`, `padding: 18px 12px`, 배경 `rgb(var(--sheet)/.6)`, `blur(24px) saturate(1.6)`, 그림자 라이트 `inset 0 0 0 .5px rgb(255 255 255/.7), 0 10px 30px -14px rgb(40 30 20/.3)`. 브랜드 `font-serif` 700 24px, `padding: 4px 12px 22px`. 항목 높이 44, `px-3 rounded-[10px]`, 500 16px, 아이콘 21px `text-ink-sub`, 현재 항목 배경 `rgb(127 127 127/.14)`·`font-[650]`·아이콘 accent. 네 탭 → 14px 간격 → 찾기(`Search`, `/search`) → 알림(`Bell`, `/social/notifications`, 새 소식이면 오른쪽 끝 accent 점) → 빈 공간 → 책 등록 버튼(`Button` primary, `Plus`, `/books/new`, 높이 46, `rounded-[23px]`). `aside aria-label="주요 메뉴"`.
- **GuestBar**: 지금 `Header`의 로고 + `Navbar`의 비로그인 `GuestAuthLinks`(redirect 파라미터 유지, Suspense 경계 포함)를 그대로 옮긴 바. **`landing` 틀에서만** 렌더(랜딩 재작성 PR이 대체). 높이 `var(--app-mobile-header-height)`.
- **AppShell**: 로그인 구독·캐시 정리·프리페치 로직은 그대로. `BARE_PREFIXES`를 지우고 `frame = frameFor(pathname)`, `nav = showsNav(frame, loggedIn, pathname)`. 렌더: `TopBarProvider` 안에 `RuledPaper`(`besideSidebar={nav}`) → `nav`이고 frame이 `plain`·`leaves`·`feed`면 `TopBar` → `TabBar`·`Sidebar`(nav일 때) → `GuestBar`(landing) → `main`.
- **main 여백**(시안 `.page`·`.wrap`·`.plain .wrap`):
  - `plain`·`feed`: 모바일 `px-6 pt-[calc(64px+var(--app-safe-top))] pb-[calc(var(--app-tabbar-h)+48px+var(--app-safe-bottom))]`; lg: `ml-[var(--app-side)] pt-11 pr-14 pb-16 pl-20`, 안쪽 `max-w-[860px]`(`feed`는 `max-w-[1400px]`). nav가 없으면 아래 여백 `pb-[calc(48px+var(--app-safe-bottom))]`, lg `ml-0`.
  - `bare`: `mx-auto max-w-[1100px] px-6 pt-[calc(12px+var(--app-safe-top))] pb-[calc(48px+var(--app-safe-bottom))]`.
  - `leaves`: 모바일 여백 없음(장이 맡음), lg `ml-[var(--app-side)]`.
  - `landing`: 여백 없음(지금처럼).
  - 모두 `relative z-[1]`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it.each([['/entry/3', '오늘'], ['/books/1', '책장'], ['/settings', '나']])('%s에서는 %s 탭이 현재', (p, label) => {
  mockPathname(p); render(h(TabBar));
  expect(screen.getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page');
});
it('탭 순서와 주소', () => {
  mockPathname('/today'); render(h(TabBar));
  expect(screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['오늘', '/today'], ['책장', '/books'], ['소셜', '/social'], ['나', '/profile']]);
});
it('찾기 화면에서는 어떤 탭도 현재가 아니다', () => {
  mockPathname('/search'); render(h(TabBar));
  expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
});
```

- [ ] **Step 2: FAIL 확인. Step 3: 부품 구현, AppShell 교체, Header·Navbar 삭제.** `grep -rn "components/Header\|components/Navbar\|app-mobile-nav-padding" app components lib hooks` → 결과 없음.
- [ ] **Step 4: PASS, `npm run lint`, `npm run build`.**
- [ ] **Step 5: 커밋** — `feat: 떠 있는 탭 바와 데스크톱 사이드바로 화면을 오간다`

### Task 12: 장 넘김

**Files:**
- Create: `components/shell/Leaves.tsx`, `hooks/useStableViewportHeight.ts`
- Modify: `app/globals.css`(장 넘김 CSS)
- Test: `hooks/__tests__/useStableViewportHeight.test.ts`, `components/shell/__tests__/leaves.test.ts`

**Interfaces:**
- Consumes: `useTopBarState().setLeafTitle/setScrolled`(Task 10), `.vellum`(Task 5), `.bar-material`(Task 11).
- Produces:

```ts
function useStableViewportHeight(): void   // --vh = innerHeight px, innerWidth가 바뀔 때만 갱신
function Leaves({ children }: { children: React.ReactNode }): JSX.Element          // 모바일 장 묶음(lg:hidden)
function Leaf(p: { title: string; label?: string; vellum?: boolean; free?: boolean; children: React.ReactNode }): JSX.Element
function LeafStack({ children }: { children: React.ReactNode }): JSX.Element        // 덮기 관계(첫 장 고정, 뒤 장이 간지로 덮음)
function DesktopLeaves({ children }: { children: React.ReactNode }): JSX.Element    // 데스크톱 장 묶음(hidden lg:block)
function DesktopLeaf(p: { id: string; children: React.ReactNode }): JSX.Element
function LeafSwitch(p: { label: string; items: { id: string; label: string }[] }): JSX.Element  // 오른쪽 위 전환 버튼
```

CSS(시안 `.snap/.leaf`, `.dsnap/.dleaf`, `.dseg` — `body.snap` 대신 컴포넌트 클래스 존재로 켠다):

```css
@media (max-width: 1023px) {
  html:has(.leaves) { scroll-snap-type: y mandatory; }
  .leaves .leaf { position: relative; height: var(--vh, 100svh); scroll-snap-align: start; scroll-snap-stop: always; overflow: hidden;
    padding: calc(60px + var(--app-safe-top)) 24px calc(var(--app-tabbar-h) + 30px + var(--app-safe-bottom)); }
  .leaves .leaf-stack > .leaf:first-child { position: sticky; top: 0; }
  .leaves .leaf-stack > .leaf.vellum + .leaf, .leaves .leaf-stack > .leaf + .leaf.vellum { border-radius: 14px 14px 0 0; }
  .leaves .leaf--free { height: auto; min-height: max(var(--vh, 100svh), 100lvh); overflow: visible; }
  /* 시안의 settle·sink 스크롤 연동 애니메이션: @supports (animation-timeline: view()) + prefers-reduced-motion: no-preference 안에서만,
     .leaf-stack 기준으로 시안 값 그대로(settle: translateY(24px) rotate(1.6deg) origin 100% 0 → none; sink: scale(.965) opacity .4 blur(1.5px)) */
}
@media (min-width: 1024px) {
  html:has(.dleaves) { scroll-snap-type: y mandatory; }
  .dleaf { position: relative; min-height: 100dvh; max-width: 1400px; padding: 40px 56px 40px 80px; scroll-snap-align: start; scroll-snap-stop: always; }
  .dleaf + .dleaf { border-top: 1px solid rgb(var(--hairline)); }
}
```

`LeafSwitch`: lg 이상, `fixed top-6 right-8 z-30`, 높이 40, `p-[3px] rounded-xl grid grid-flow-col`, 배경 `rgb(var(--sheet)/.7)` + `blur(20px) saturate(1.6)` + `.bar-material`. 항목 `px-4 rounded-[9px]` 600 14px `text-ink-sub`; 현재 항목 배경 `rgb(var(--sheet))`·`text-ink`·`shadow 0 1px 3px rgb(0 0 0/.12)`(다크는 시안 "밤의 선택 표시" 값, CSS 다크 블록). `IntersectionObserver` threshold .55로 보이는 `DesktopLeaf`의 id에 맞춰 현재 항목을 바꾼다. `nav aria-label={label}`, 현재 항목 `aria-current="true"`.

`Leaves` 안의 현재 장(시안 `shell.js`): 각 `Leaf`를 threshold `[0, .6, 1]`로 관찰, 60% 이상 보이는 장 중 DOM 순서로 가장 뒤의 장(없으면 첫 장)이 현재. `setLeafTitle(현재.title)`, `setScrolled(현재 !== 첫 장)`. 언마운트 시 `setLeafTitle(null)`, `setScrolled(false)`.

- [ ] **Step 1: 실패하는 테스트**

```ts
// useStableViewportHeight
it('폭이 같으면 높이가 바뀌어도 --vh를 그대로 둔다', () => {
  setWindow(390, 700); renderHook(() => useStableViewportHeight());
  expect(vh()).toBe('700px');
  setWindow(390, 760); fireEvent(window, new Event('resize'));
  expect(vh()).toBe('700px');
  setWindow(844, 390); fireEvent(window, new Event('resize'));
  expect(vh()).toBe('390px');
});
// Leaves (IntersectionObserver 가짜)
it('60% 넘게 보이는 가장 뒤의 장 제목이 상단 바 제목이 된다', () => {
  renderWithTopBar(h(Leaves, null, h(Leaf, { title: '오늘' }, 'a'), h(Leaf, { title: '지난 7일', vellum: true }, 'b')));
  act(() => io.report([{ title: '오늘', ratio: 1 }, { title: '지난 7일', ratio: 0.7 }]));
  expect(topBarState().leafTitle).toBe('지난 7일');
  expect(topBarState().scrolled).toBe(true);
});
```

- [ ] **Step 2: FAIL 확인. Step 3: 구현. Step 4: PASS.**
- [ ] **Step 5: 커밋** — `feat: 모바일에서 한 화면씩 장을 넘기고 데스크톱에서 장을 전환한다`

### Task 13: 바텀 시트

**Files:**
- Create: `components/ui/Sheet.tsx`
- Modify: `components/ui/Modal.tsx`(Sheet 위로), `app/globals.css`·`tailwind.config.js`(`--scrim` / `scrim`)
- Test: `components/ui/__tests__/sheet.test.ts`

**Interfaces:**
- Consumes: `InertBackground`, Headless UI `Dialog`(`static`) + framer `AnimatePresence` — `EntryEditSheet`와 같은 공식 패턴, `EASE_DRAWER`·`EASE_OUT`(`lib/motion.ts`).
- Produces: `Sheet({ open, onClose, title?, closeLabel = '닫기', children }: { open: boolean; onClose: () => void; title?: string; closeLabel?: string; children: React.ReactNode }): JSX.Element`. `Modal`의 props(`isOpen`, `onClose`, `children`)는 그대로, 내부만 `Sheet`.

모양(시안 "바텀 시트"): 토큰 `--scrim: 20 14 8`, 배경막 `rgb(var(--scrim)/.32)` 320ms 페이드. 패널 모바일: 아래 붙음, `w-full max-w-[560px] mx-auto max-h-[88dvh] overflow-auto overscroll-contain`, 배경 불투명 `bg-sheet`, `rounded-t-[18px]`, `box-shadow: 0 -10px 40px -10px rgb(30 20 10/.35)`; 들어올 때 `y: 100% → 0` 320ms `EASE_DRAWER`, 나갈 때 반대. 손잡이 36×5 `rounded-[3px]` `bg-[rgb(127_127_127/.35)]` `mt-2 mx-auto`(lg에서 숨김). 몸 `padding: 10px 22px calc(26px + var(--app-safe-bottom))`. 머리(title이 있을 때) min-h 48: 제목 `DialogTitle` 700 18px sans, 닫기 버튼 오른쪽 accent 600 16px min-h 44. lg 이상: 가운데 창, `rounded-2xl`(16px), `box-shadow: 0 30px 80px -20px rgb(30 20 10/.45)`, opacity 0→1·scale .97→1 200ms `EASE_OUT`. 모바일/데스크톱 판정은 `react-responsive` `useMediaQuery({ minWidth: 1024 })`. 동작 줄이기는 `MotionProvider`가 이동을 뺀다.

- [ ] **Step 1: 실패하는 테스트** (jsdom)

```ts
it('제목과 닫기, 닫기를 누르면 onClose', () => {
  const onClose = vi.fn();
  render(h(Sheet, { open: true, onClose, title: '책 고르기' }, h('p', null, '내용')));
  expect(screen.getByRole('dialog', { name: '책 고르기' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('Esc로 닫는다', () => {
  const onClose = vi.fn();
  render(h(Sheet, { open: true, onClose, title: '책 고르기' }, h('button', null, '안')));
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
it('닫혀 있으면 그리지 않는다', () => {
  render(h(Sheet, { open: false, onClose: () => {}, title: 'x' }, 'y'));
  expect(screen.queryByRole('dialog')).toBeNull();
});
```

- [ ] **Step 2: FAIL 확인. Step 3: 구현, Modal 교체. Step 4: PASS**, Modal을 쓰는 화면(`grep -rln "ui/Modal" app components`)이 빌드되는지 `npm run build`.
- [ ] **Step 5: 커밋** — `feat: 아래에서 올라오는 간지 시트가 생기고 확인 창도 같은 모양이 된다`

### Task 14: 견본·문서·PR ③

**Files:**
- Modify: `app/design-lab/page.tsx`(시트 열기 버튼, `LargeTitle`, `useTopBar` 견본)
- Create: `app/design-lab/leaves/page.tsx`
- Modify: `docs/ui-guidelines.md`(화면 틀·장 넘김·바텀 시트 절, Modal 행 갱신), `AGENTS.md`(공간 표의 코드 입구에 `components/shell/` 추가), `DESIGN.md`(바 재질 문장 확인)

- [ ] **Step 1: 견본** — `/design-lab`: `LargeTitle`('토대 견본'), 시트 열기 버튼(`Sheet` title '책 고르기', 시안 home2의 책 고르기 줄 셋). `/design-lab/leaves`: 프로덕션 404 같은 가드. 모바일 `Leaves` — `Leaf title='오늘'` → `LeafStack`(`Leaf title='그때의 생각'` + `Leaf title='덧붙인 생각' vellum`, 안에 `Pile`) → `Leaf title='읽던 책' vellum free`; 데스크톱 `LeafSwitch` + `DesktopLeaves` 세 장. 문구는 시안 home2·entry-layer에서.
- [ ] **Step 2: 문서** — ui-guidelines: "화면 틀"(틀 다섯 가지와 `frameFor`, 상단 바 설정 `useTopBar`, 탭 바·사이드바 값의 원본은 컴포넌트, 탭 이름 오늘·책장·소셜·나), "장 넘김"(덮이면 연결된 것·넘어가면 다음 것, 도구 화면은 흐름, 스크롤 안내 금지, `LEAVES_ROUTES`에 화면을 추가하는 법), "바텀 시트"(`Sheet` 사용, 기존 시트들은 화면 PR에서 옮김). 움직임 절의 "바닥 시트는 `SHEET_TRANSITION`(350ms)"을 `Sheet` 320ms로 고치고 기존 시트는 이전 중이라고 적는다.
- [ ] **Step 3: 검사** — `npm test`, `npm run lint`, `npm run build`.
- [ ] **Step 4: 미리보기 검증** (Playwright, 공유 링크)
  - `/design-lab`, `/design-lab/leaves`를 390×844·1180×820·1440×900 × 라이트·다크. 시안 `home2.html`·`books.html`·`search.html`과 같은 폭으로 나란히: 탭 바 자리(좌우 16, 아래 10), 캡슐 높이 64, 사이드바 폭 224와 위치, 상단 바 52 + 큰 제목 34/40.
  - 상단 바: 큰 제목을 스크롤해 가리면 재질·작은 제목 전환. `/design-lab/leaves`에서 장마다 제목이 바뀜.
  - 장 넘김: 모바일 폭에서 휠/스와이프 한 번에 한 장, 덮기 장에서 첫 장 고정. 뷰포트 높이만 바꿔도(`setViewportSize(390, 700→760)`) `--vh` 그대로.
  - 키보드: Tab 순서 상단 바 → 본문 → 탭 바(모바일) / 사이드바 → 본문(데스크톱). 시트 열고 Tab이 시트 안에 갇히고 Esc로 닫힌 뒤 초점이 열기 버튼으로.
  - 비로그인 `/login`: 메뉴 없음(bare). 랜딩 `/`: GuestBar의 로그인·시작하기가 그대로.
  - 로그인 상태(사용자 확인 항목으로 PR에 나열): `/today`·`/books`·`/social`·`/profile`에서 탭 바가 옛 화면 하단 조작을 가리지 않음, 알림 점, iPhone 설치형 PWA 안전 영역.
- [ ] **Step 5: 커밋·push·Draft PR** — 제목 예: `feat: 떠 있는 탭 바·사이드바와 한 장씩 넘기는 화면 틀이 생긴다`. 본문에 견본 주소, 시안과 다른 점(장 넘김을 `body.snap` 대신 `html:has(.leaves)`로 켬, `Modal`도 시트 모양이 됨), 사용자 확인 목록, 미검증(투명도 줄이기, iPhone 실기기).

---

## 이번 계획이 하지 않는 것

- 화면 이전(오늘·책·기록·나·소셜·도구 화면), 책 플래그·원고지·달마다 간지, 랜딩 — 스펙 6절 5–7, 별도 계획.
- 기존 시트들(`EntryEditSheet`, `CommentBottomSheet`, `LikersBottomSheet`, `WeeklyLetterSheet` 등)의 `Sheet` 이전 — 해당 화면 PR.
- 옛 토큰·부품(`card-raised`, `--ease-page`, 3D 책·엽서)과 `/design-lab` 삭제 — 6절 9.
