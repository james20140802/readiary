# Plan ② 에디토리얼 디자인 시스템: "먹과 종이" 토큰·서체·프리미티브

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 전체의 시각 언어를 "먹과 종이" 에디토리얼 시스템으로 교체한다 — CSS 변수 기반 컬러 토큰(자동 다크), 콘텐츠 부리 서체(마루 부리 셀프호스팅), 그림자 폐지·헤어라인 전환, UI 프리미티브 재작성, 아이콘 lucide 단일화.

**Architecture:** 컬러는 `globals.css`의 CSS 변수(RGB 트리플릿)로 정의하고 Tailwind 토큰이 `rgb(var(--x) / <alpha-value>)`로 참조한다. 라이트/다크는 `@media (prefers-color-scheme)`에서 변수만 바뀌므로 **기존 `dark:` 프리픽스 페어는 전부 제거**한다. 기존 시맨틱 토큰명(tint/surface/label/border)은 새 어휘(accent/paper·card/ink/hairline)로 기계적 sed 치환한다. 강조색은 `--accent` 변수 하나로 모이며, `<html data-accent="vermilion">` 오버라이드로 두 후보(잉크 파랑 vs 주홍)를 실화면 비교할 수 있게 한다 — 기본값은 잉크 파랑, 확정은 사용자 몫.

**Tech Stack:** Next.js 16(App Router, `--webpack`), Tailwind 3.4(`darkMode: 'media'` 유지), `next/font/local`(마루 부리), lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md` §6 (디자인 시스템)
**시안:** https://claude.ai/code/artifact/0c6c9d2f-7c58-4f19-b562-3fb048e160c4 ("먹과 종이")

## Global Constraints

- 커밋 메시지는 gitmoji + 한국어 (예: `💄 style(tokens): ...`), 말미에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 빌드 확인은 `npm run build`, 타입 확인은 `npx tsc --noEmit`, 테스트는 `npm test`
- **새 dependency 금지.** react-icons는 이 플랜에서 **제거**한다(추가 아님).
- UI 카피는 한국어
- **기울어진 도장 박스(스탬프) 장식 금지** — 날짜/상태 표식은 잉크색 작은 산세리프 라벨(`Seal` 컴포넌트). 한자 장식은 허용.
- 기존 원색 `#3B82F6` 사용 금지. 강조색 기본값은 잉크 파랑 `#2D5FB8`(다크 `#85A9EC`), 주홍 후보 `#C1441E`는 `data-accent="vermilion"` 오버라이드로만.
- 다크모드는 OS 설정 따름(`darkMode: 'media'`), 앱 내 토글 없음. 새 코드에서 색상 `dark:` 프리픽스 사용 금지(토큰이 자동 전환).
- 그림자 사용 금지 — 표면 구분은 1px 헤어라인 보더와 배경 단차로.
- 이모지 장식 지양(기존 카피의 이모지는 이 플랜에서 일괄 제거하지 않지만, 이 플랜이 재작성하는 파일에서는 제거).

---

### Task 1: 서체 — 마루 부리 셀프호스팅 + serif 토큰

**Files:**
- Create: `app/fonts/MaruBuri-Regular.woff2`, `app/fonts/MaruBuri-SemiBold.woff2`, `app/fonts/MaruBuri-Bold.woff2` (다운로드)
- Create: `app/fonts.ts`
- Modify: `app/layout.tsx` (html className에 변수 부착)
- Modify: `tailwind.config.js` (fontFamily.serif 추가)

**Interfaces:**
- Produces: CSS 변수 `--font-serif`(html에 부착), Tailwind 클래스 `font-serif`. Task 3의 프리미티브와 이후 Plan ③~⑤의 문장 카드·발췌집이 사용.

- [ ] **Step 1: 폰트 파일 다운로드**

```bash
mkdir -p app/fonts
curl -fLo app/fonts/MaruBuri-Regular.woff2 https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff2
curl -fLo app/fonts/MaruBuri-SemiBold.woff2 https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-SemiBold.woff2
curl -fLo app/fonts/MaruBuri-Bold.woff2 https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Bold.woff2
ls -la app/fonts/  # 각 파일 수백 KB인지 확인 (0바이트면 실패)
```

(URL은 2026-08-26에 200 확인됨. 실패 시 https://hangeul.naver.com/fonts 에서 마루 부리 woff2 배포 URL을 확인해 대체한다. 마루 부리는 네이버가 무료 배포하는 서체로 웹폰트 셀프호스팅이 허용된다.)

- [ ] **Step 2: `app/fonts.ts` 작성**

```ts
import localFont from 'next/font/local';

export const maruBuri = localFont({
  src: [
    { path: './fonts/MaruBuri-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/MaruBuri-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/MaruBuri-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-serif',
  display: 'swap',
  fallback: ['Noto Serif KR', 'serif'],
});
```

- [ ] **Step 3: `app/layout.tsx`에 변수 부착**

```tsx
import { maruBuri } from './fonts';
```

`<html lang="ko">`를 `<html lang="ko" className={maruBuri.variable}>`로 변경.

- [ ] **Step 4: `tailwind.config.js` fontFamily에 serif 추가**

`fontFamily` 블록을 다음으로 교체:

```js
fontFamily: {
  sans: ['Pretendard', 'var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
  serif: ['var(--font-serif)', 'Noto Serif KR', 'Georgia', 'serif'],
},
```

- [ ] **Step 5: 확인**

Run: `npx tsc --noEmit && npm run build`
Expected: 에러 0. (시각 확인은 Task 5에서 일괄.)

- [ ] **Step 6: 커밋**

```bash
git add app/fonts app/fonts.ts app/layout.tsx tailwind.config.js
git commit -m "💄 style(fonts): 마루 부리 셀프호스팅 및 serif 토큰 추가"
```

---

### Task 2: 컬러·표면 토큰 전면 교체 (CSS 변수 + 기계적 마이그레이션)

**Files:**
- Modify: `app/globals.css` (CSS 변수 정의 + body 스타일)
- Modify: `tailwind.config.js` (colors/fontSize/borderRadius/boxShadow 교체)
- Modify: `app/layout.tsx` (themeColor, body className)
- Modify(기계적 치환): `app/`, `components/`, `lib/` 하위 `.tsx` 전체 — 구 토큰(`tint`/`surface`/`label`/`border-border`/`dark-*`/`shadow-card*`)과 미정의 토큰(`text-secondary`/`bg-background`/`placeholder-secondary`) 사용처 전부

**Interfaces:**
- Consumes: 없음 (Task 1과 독립 — 같은 `tailwind.config.js`를 수정하므로 Task 1 이후 실행)
- Produces: Tailwind 토큰 `bg-paper` `bg-card` `bg-card-raised` `text-ink` `text-ink-sub` `text-ink-faint` `text-ink-invert` `border-hairline` `border-hairline-strong` `bg-accent` `text-accent` `bg-accent-soft` `hover:bg-accent-hover` `bg-danger` `bg-danger-soft` `bg-success` `bg-success-soft`, `text-seal`, `text-quote`. 색상은 라이트/다크 자동 전환(새 코드에서 색상 `dark:` 불필요). Task 3·4와 이후 모든 플랜이 이 토큰만 사용한다.

- [ ] **Step 1: `app/globals.css` 전체를 다음으로 교체**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

/* ── 먹과 종이 팔레트 ─────────────────────────────
   RGB 트리플릿(공백 구분)로 정의해 Tailwind의
   rgb(var(--x) / <alpha-value>) 알파 변조를 지원한다.
   시안: docs/superpowers/specs/... §6, 아티팩트 "먹과 종이" */
:root {
  --paper: 247 243 236;        /* #F7F3EC 종이 */
  --card: 253 251 247;         /* #FDFBF7 카드 */
  --card-raised: 242 236 225;  /* #F2ECE1 돌출 표면 */
  --ink: 34 30 26;             /* #221E1A 먹 */
  --ink-sub: 110 102 92;       /* #6E665C 회갈 */
  --ink-faint: 163 154 141;    /* #A39A8D 옅은 먹 */
  --ink-invert: 253 251 247;   /* 먹 배경 위 글자 */
  --hairline: 227 220 208;     /* #E3DCD0 */
  --hairline-strong: 207 197 180; /* #CFC5B4 */
  --accent: 45 95 184;         /* #2D5FB8 파란 잉크 (기본 후보) */
  --accent-hover: 36 80 158;
  --danger: 166 61 47;         /* #A63D2F 가라앉힌 적갈 */
  --success: 74 124 89;        /* #4A7C59 가라앉힌 초록 */
}

/* 강조색 후보 B: 주홍 — 실화면 비교용. 확정 전까지 유지(스펙 §2-6) */
:root[data-accent='vermilion'] {
  --accent: 193 68 30;         /* #C1441E */
  --accent-hover: 168 58 25;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: 27 22 18;         /* #1B1612 어두운 종이 */
    --card: 36 30 25;          /* #241E19 */
    --card-raised: 46 39 33;
    --ink: 234 226 214;        /* #EAE2D6 미색 먹 */
    --ink-sub: 154 143 129;    /* #9A8F81 */
    --ink-faint: 110 101 90;
    --ink-invert: 27 22 18;
    --hairline: 58 50 42;      /* #3A322A */
    --hairline-strong: 74 64 54;
    --accent: 133 169 236;     /* #85A9EC 밤의 잉크 */
    --accent-hover: 159 188 240;
    --danger: 201 106 87;
    --success: 127 174 143;
  }
  :root[data-accent='vermilion'] {
    --accent: 224 118 79;
    --accent-hover: 232 139 105;
  }
  html {
    color-scheme: dark;
  }
}

body {
  font-family: 'Pretendard', var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  background-color: rgb(var(--paper));
  color: rgb(var(--ink));
  overflow-y: scroll;
  -ms-overflow-style: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body::-webkit-scrollbar {
  display: none;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

li {
  list-style-type: none;
}

::selection {
  background: rgb(var(--accent) / 0.18);
}
```

- [ ] **Step 2: `tailwind.config.js`의 theme.extend를 다음으로 교체**

(Task 1이 추가한 `fontFamily.serif`는 유지한다.)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          raised: 'rgb(var(--card-raised) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          sub: 'rgb(var(--ink-sub) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
          invert: 'rgb(var(--ink-invert) / <alpha-value>)',
        },
        hairline: {
          DEFAULT: 'rgb(var(--hairline) / <alpha-value>)',
          strong: 'rgb(var(--hairline-strong) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          soft: 'rgb(var(--accent) / 0.07)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          soft: 'rgb(var(--danger) / 0.08)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          soft: 'rgb(var(--success) / 0.08)',
        },
      },
      fontSize: {
        'page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'section-title': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.6rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        button: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        caption: ['0.75rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        overline: ['0.6875rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.05em' }],
        seal: ['0.65625rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.16em' }],
        quote: ['1.25rem', { lineHeight: '1.85', fontWeight: '400' }],
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      fontFamily: {
        sans: ['Pretendard', 'var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-serif)', 'Noto Serif KR', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
```

(주의: `boxShadow` 블록은 **삭제**한다 — 그림자 토큰 폐지. `borderRadius`는 종이 감성에 맞게 절반 수준으로 축소된 값이다.)

- [ ] **Step 3: `app/layout.tsx` 갱신**

- `viewport`를 다음으로 교체:

```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F3EC' },
    { media: '(prefers-color-scheme: dark)', color: '#1B1612' },
  ],
};
```

- `<body>` className을 `"overflow-x-hidden bg-paper text-ink"`로 교체.
- `<Toaster>`의 `toastOptions.className`을 `'text-sm font-sans text-ink bg-card rounded-md border border-hairline px-4 py-3'`으로 교체.

- [ ] **Step 4: 기계적 치환 실행 (순서 중요)**

macOS BSD sed 기준. **아래 순서 그대로**, 전체를 하나의 Bash 호출로 실행한다 — 긴 토큰을 먼저 치환해야 접두어 오염이 없다. (zsh는 미인용 변수를 단어 분리하지 않으므로 반드시 `echo $FILES | xargs` 형태를 쓴다.)

```bash
FILES=$(grep -rlE "tint|surface|label|border-border|divide-border|bg-border|dark-|shadow-card|shadow-tint|text-secondary|bg-background|placeholder-secondary" app components lib --include='*.tsx' --include='*.ts')
run() { echo $FILES | xargs sed -i '' "$@"; }

# 0) 다크 페어 제거 (변수가 자동 전환하므로 클래스 자체를 삭제)
run -E 's/ ?dark:[a-zA-Z0-9:_/.[-]*dark-[a-zA-Z0-9/.-]*//g'
run -E 's/ ?dark:(hover:)?(text|bg|border|ring|placeholder)-label[a-zA-Z-]*//g'

# 1) label → ink (긴 것부터)
run -e 's/label-invert/ink-invert/g' -e 's/label-sub/ink-sub/g' -e 's/label-muted/ink-faint/g'
run -e 's/-label/-ink/g'

# 2) surface → paper/card (긴 것부터)
run -e 's/surface-page/paper/g' -e 's/surface-raised/card-raised/g'
run -e 's/-surface/-card/g'

# 3) tint → accent (긴 것부터)
run -e 's/tint-subtle/accent-soft/g' -e 's/tint-muted/accent\/30/g' -e 's/tint-hover/accent-hover/g'
run -e 's/-tint/-accent/g'

# 4) border/divide
run -e 's/border-border-strong/border-hairline-strong/g' -e 's/border-border-subtle/border-hairline/g'
run -e 's/border-border/border-hairline/g' -e 's/divide-border/divide-hairline/g' -e 's/bg-border/bg-hairline/g'

# 5) danger/success 서브톤
run -e 's/danger-subtle/danger-soft/g' -e 's/danger-muted/danger\/30/g'
run -e 's/success-subtle/success-soft/g' -e 's/success-muted/success\/30/g'

# 6) 그림자 제거
run -E 's/ ?(hover:)?shadow-(card(-md|-lg)?|accent|tint)//g'

# 7) 미정의 토큰 정리
run -e 's/placeholder-secondary/placeholder:text-ink-faint/g' -e 's/text-secondary/text-ink-sub/g' -e 's/bg-background/bg-card/g'
```

- [ ] **Step 5: 잔여물 수동 정리**

아래 grep이 **빈 결과**가 될 때까지 남은 사용처를 손으로 수정한다:

```bash
grep -rnE "(bg|text|border|ring|divide|placeholder|from|to)-(tint|surface|label)|border-border|dark-(page|surface|raised|border)|shadow-card|bg-background|text-secondary|placeholder-secondary" app components lib --include='*.tsx' --include='*.ts'
```

색상 계열 `dark:` 프리픽스 잔여도 확인한다(레이아웃용 `dark:`는 원래 없음):

```bash
grep -rnE "dark:[a-z-]*(bg|text|border|ring)-" app components lib --include='*.tsx'
```

남은 것은 이 매핑으로 손수정: 다크 전용 색 페어 → 클래스 삭제(토큰이 자동 전환), `dark:bg-black/25` 류 오버레이 → 그대로 두거나 `bg-ink/40`으로 통일.

- [ ] **Step 6: 원색 팔레트(raw Tailwind color) 정리**

```bash
grep -rnE "(bg|text|border|ring)-(red|green|blue|zinc|gray|slate|orange|yellow|amber)-[0-9]+" app components --include='*.tsx'
```

약 30곳. 매핑 규칙:

| 기존 | 교체 |
| --- | --- |
| `red-400/500/600` (텍스트·보더·링) | `danger` |
| `bg-red-50/100`, `border-red-100` | `bg-danger-soft`, `border-danger/30` |
| `bg-red-900`, `border-red-900` (다크 페어였던 것) | 클래스 삭제 |
| `green-*` | `success` / `success-soft` |
| `blue-*` | `accent` / `accent-soft` |
| `orange-*` (스트릭 불꽃 등 장식) | `accent` (강조) 또는 `ink-faint` (비활성) — 문맥 판단 |
| `gray/zinc/slate-400~600` | `ink-sub` 또는 `ink-faint` |
| `gray/zinc/slate-700~900` | `ink` |
| `text-white` (accent/ink/danger 배경 위) | `text-ink-invert` (단, 사진 위 오버레이 텍스트는 `text-white` 유지) |

- [ ] **Step 7: 타입·빌드·테스트 확인**

```bash
npx tsc --noEmit && npm test && npm run build
```

Expected: 에러 0. sed가 코드 식별자(예: `label` prop, `summary` 등)를 건드렸다면 여기서 드러난다 — sed는 클래스 문자열 밖도 치환할 수 있으므로 `git diff`에서 className 문자열 밖 변경(특히 `-label`→`-ink` 패턴이 prop명·변수명을 건드린 경우)이 없는지 훑어보고 되돌린다. (`FormGroup`의 `label` prop 등 bare 단어는 하이픈 규칙 때문에 안전하지만, `aria-label`은 `-label` 패턴에 걸린다 — **`aria-ink`로 바뀐 곳이 있으면 전부 `aria-label`로 복구**: `grep -rn "aria-ink" app components lib`)

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "💄 style(tokens): 먹과 종이 CSS 변수 토큰 도입 및 전면 치환"
```

---

### Task 3: UI 프리미티브 재작성 + Seal·Chip 신설

**Files:**
- Modify: `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Input.tsx`, `components/ui/Textarea.tsx`, `components/ui/Modal.tsx`, `components/ui/Tabs.tsx`, `components/ui/FormGroup.tsx`, `components/ui/FormLabel.tsx`, `components/ui/Avatar.tsx`
- Create: `components/ui/Seal.tsx`, `components/ui/Chip.tsx`

**Interfaces:**
- Consumes: Task 2의 토큰 (`bg-card`, `border-hairline`, `text-ink*`, `accent`, `text-seal` 등)
- Produces (기존 프리미티브의 **props 시그니처는 전부 유지** — 호출부 수정 없음):
  - `Button({ variant?: 'primary'|'secondary'|'ghost'|'danger'|'success', size?, fullWidth?, asChild?, loading? })` — primary는 먹 배경 알약형
  - `Card({ variant?: 'default'|'raised'|'flat'|'ghost', hoverable?, onClick?, disabled? })` — 헤어라인, 그림자 없음
  - 신규 `Seal({ children, className? })` — 잉크색 날짜/상태 라벨 (`<Seal>1년 전 오늘</Seal>`)
  - 신규 `Chip({ children, selected?, dot?, onClick?, className? })` — 알약형 선택 칩 (Plan ③ 책 선택 칩이 사용)

- [ ] **Step 1: `components/ui/Button.tsx` 전체 교체**

```tsx
'use client';

import { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * primary : 주요 액션 (먹 배경)
   * secondary: 보조 액션 (헤어라인 아웃라인)
   * ghost   : 텍스트형 버튼
   * danger  : 삭제/경고
   * success : 완료/확인
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  asChild?: boolean;
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  className,
  asChild,
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base = clsx(
    'inline-flex items-center justify-center gap-2',
    'font-sans font-bold rounded-full transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
    'active:opacity-80',
    'disabled:opacity-50 disabled:pointer-events-none'
  );

  const variants = {
    primary: 'bg-ink text-ink-invert hover:opacity-90',
    secondary: 'bg-transparent text-ink border border-hairline-strong hover:bg-card-raised',
    ghost: 'bg-transparent text-ink-sub hover:bg-card-raised hover:text-ink',
    danger: 'bg-danger text-ink-invert hover:opacity-90',
    success: 'bg-success text-ink-invert hover:opacity-90',
  };

  const sizes = {
    sm: 'h-8  px-4 text-caption gap-1.5',
    md: 'h-10 px-5 text-button',
    lg: 'h-12 px-7 text-button text-base',
  };

  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      type={asChild ? undefined : type}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
```

(다크 모드에서 `bg-ink`는 미색, `text-ink-invert`는 어두운 종이색이 되어 자동으로 반전된다.)

- [ ] **Step 2: `components/ui/Card.tsx` 전체 교체**

```tsx
import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  variant?: 'default' | 'raised' | 'flat' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  [key: string]: unknown;
}

export default function Card({
  children,
  className,
  hoverable = true,
  variant = 'default',
  onClick,
  disabled,
  ...props
}: CardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={clsx(
        'rounded-md p-5',
        variant === 'default' && 'bg-card border border-hairline',
        variant === 'raised' && 'bg-card border border-hairline-strong',
        variant === 'flat' && 'bg-card-raised border border-hairline',
        variant === 'ghost' && 'bg-transparent',
        hoverable && !disabled && 'transition-colors hover:border-hairline-strong cursor-pointer',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

(raised는 그림자 대신 **더 진한 헤어라인**으로 위계를 준다 — 시안의 `.memory-card` 문법.)

- [ ] **Step 3: `components/ui/Input.tsx` 전체 교체**

```tsx
import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, className, ...props }, ref) => {
    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && <label className="block mb-1 text-sm font-medium text-ink">{label}</label>}
        <input
          ref={ref}
          className={clsx(
            'w-full',
            'rounded-md px-4 py-2 text-sm border transition-colors',
            'bg-card text-ink placeholder:text-ink-faint',
            'border-hairline-strong focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
            error && 'border-danger focus:ring-danger focus:border-danger',
            props.disabled && 'bg-card-raised cursor-not-allowed opacity-60',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
```

- [ ] **Step 4: `components/ui/Textarea.tsx` 전체 교체**

```tsx
'use client';

import { clsx } from 'clsx';
import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  fullWidth?: boolean;
};

export function Textarea({ label, error, fullWidth = false, className, ...props }: TextareaProps) {
  return (
    <div className={clsx('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'block px-4 py-3 rounded-md border text-sm leading-relaxed transition-colors',
          'bg-card text-ink placeholder:text-ink-faint',
          'border-hairline-strong focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
          fullWidth && 'w-full',
          error && 'border-danger',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: `components/ui/Modal.tsx`의 Dialog.Panel·오버레이 클래스 교체**

오버레이 `<div className="fixed inset-0 bg-black/25" />`를 `<div className="fixed inset-0 bg-ink/30" />`로.

`Dialog.Panel` className을 다음으로 교체:

```
'w-full max-w-md transform overflow-hidden rounded-lg bg-card border border-hairline-strong p-6 text-left align-middle transition-all'
```

(다크에서 `bg-ink/30` 오버레이는 미색이 되므로 부적절해 보일 수 있으나, `--ink`가 미색으로 뒤집혀도 30% 알파의 스크림은 "종이 위 안개"로 동작한다 — 시안 확인 결과 유지. 나머지 구조·Transition은 그대로.)

- [ ] **Step 6: `components/ui/Tabs.tsx`의 클래스만 교체**

탭 컨테이너: `"flex space-x-2 border-b border-hairline"`.

버튼 클래스의 삼항을 다음으로:

```tsx
selected === tab.value
  ? 'border-b-2 border-accent text-accent'
  : 'text-ink-sub hover:text-ink'
```

또한 `'px-4 py-2 text-sm md:text-lg font-medium transition-colors'`를 `'px-4 py-2 text-sm md:text-base font-medium transition-colors'`로 (md:text-lg는 과함).

- [ ] **Step 7: `FormGroup`·`FormLabel`·`Avatar` 클래스 정리**

- `FormGroup.tsx`: label 클래스를 `"block text-sm font-medium text-ink"`로. `label`이 없으면 `<label>`을 렌더하지 않도록 `{label && <label ...>{label}</label>}`로 감싼다.
- `FormLabel.tsx`: 클래스를 `'block text-sm font-medium text-ink mb-1'`로.
- `Avatar.tsx`: 컨테이너 클래스를 `'rounded-full bg-card-raised flex items-center justify-center overflow-hidden font-bold text-ink-sub relative border border-hairline'`로.

- [ ] **Step 8: `components/ui/Seal.tsx` 신규 작성**

```tsx
import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface SealProps {
  children: ReactNode;
  className?: string;
}

/**
 * 잉크색 날짜/상태 표식 — "1년 전 오늘", "완독" 등.
 * 도장 박스 대신 쓰는 작은 산세리프 레터스페이싱 라벨 (시안 .seal).
 */
export default function Seal({ children, className }: SealProps) {
  return (
    <span className={clsx('inline-block font-sans text-seal text-accent uppercase', className)}>
      {children}
    </span>
  );
}
```

- [ ] **Step 9: `components/ui/Chip.tsx` 신규 작성**

```tsx
'use client';

import { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** 앞에 잉크색 점 표시 (선택된 책 칩 등) */
  dot?: boolean;
}

/** 알약형 선택 칩 — 책 선택, 필터 등 (시안 .chip) */
export default function Chip({ selected, dot, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
        'font-sans text-caption font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        selected
          ? 'border-ink bg-ink text-ink-invert'
          : 'border-hairline-strong bg-paper text-ink-sub hover:border-ink hover:text-ink',
        className
      )}
      {...props}
    >
      {dot && <span className="h-[7px] w-[7px] rounded-full bg-accent" aria-hidden />}
      {children}
    </button>
  );
}
```

- [ ] **Step 10: 타입·빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 11: 커밋**

```bash
git add components/ui
git commit -m "💄 style(ui): 먹과 종이 프리미티브 재작성 및 Seal·Chip 추가"
```

---

### Task 4: 전역 크롬(Header·Navbar) + 아이콘 lucide 단일화

**Files:**
- Modify: `components/Header.tsx`, `components/Navbar.tsx`
- Modify: `app/protected/books/new/_components/KakaoBookSearchForm.tsx` (MdSearch → lucide Search)
- Modify: `package.json` (react-icons 제거)

**Interfaces:**
- Consumes: Task 2 토큰, Task 1 `font-serif`
- Produces: react-icons 의존성 0. 워드마크는 부리 서체. Header/Navbar 시그니처 변화 없음.

- [ ] **Step 1: `components/Navbar.tsx` 수정**

import에서 `react-icons/md` 줄을 삭제하고 lucide로 교체:

```tsx
import { BookMarked, Home, LibraryBig, Globe, UserRound } from 'lucide-react';
```

`navItems`를 다음으로:

```tsx
const navItems = [
  { href: '/protected/dashboard', label: '홈', icon: <Home size={20} strokeWidth={1.75} /> },
  { href: '/protected/books', label: '내 책', icon: <LibraryBig size={20} strokeWidth={1.75} /> },
  { href: '/protected/social', label: '소셜', icon: <Globe size={20} strokeWidth={1.75} /> },
  { href: '/protected/profile', label: '프로필', icon: <UserRound size={20} strokeWidth={1.75} /> },
];
```

모바일 하단 nav 클래스: `"fixed bottom-0 inset-x-0 z-50 border-t border-hairline bg-paper/90 backdrop-blur-md px-4 py-2 block md:hidden"` (Task 2 치환 결과에서 `bg-card/80`이 됐다면 이 값으로 조정).
활성 링크: `pathname === item.href ? 'text-accent font-semibold' : 'text-ink-faint'` (Task 2 치환 결과 확인만).

데스크톱 상단 nav 클래스: `"hidden md:flex fixed top-0 inset-x-0 z-50 border-b border-hairline bg-paper/90 backdrop-blur-md px-8 py-5"`.
워드마크 Link 클래스: `"font-serif text-lg font-bold tracking-wide text-ink flex items-center gap-2"`.

- [ ] **Step 2: `components/Header.tsx` 수정**

header 클래스: `"fixed top-0 left-0 w-full py-3 px-4 flex items-center bg-paper/90 backdrop-blur-md z-50 border-b border-hairline"`.
워드마크 span 클래스: `"font-serif font-bold text-lg tracking-wide"`.

- [ ] **Step 3: `KakaoBookSearchForm.tsx` 아이콘 교체**

`import { MdSearch } from 'react-icons/md';` 삭제, `import { Search } from 'lucide-react';` 추가, JSX의 `<MdSearch ... />`를 `<Search size={20} />`로 교체(기존 size/className 유지).

- [ ] **Step 4: react-icons 의존성 제거**

```bash
grep -rn "react-icons" app components lib --include='*.ts*'   # 빈 결과 확인
npm uninstall react-icons
```

- [ ] **Step 5: 타입·빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "💄 style(chrome): Header·Navbar 종이 톤 적용 및 아이콘 lucide 단일화"
```

---

### Task 5: 시각 검증 + 강조색 A/B 비교 스크린샷

**Files:** 없음 (검증·산출물 생성만, 스크린샷은 레포 밖 `$CLAUDE_JOB_DIR/tmp/accent-compare/`에 저장)

**Interfaces:**
- Consumes: Task 1~4 전부
- Produces: 라이트/다크 × 잉크/주홍 스크린샷 세트 — 사용자 강조색 확정용 (스펙 §2-6)

- [ ] **Step 1: dev 서버 기동**

```bash
npm run dev &   # http://localhost:3000
```

- [ ] **Step 2: 공개 화면 스크린샷 (playwright MCP)**

playwright 브라우저 도구로 뷰포트 390×844(모바일)에서:

1. `http://localhost:3000` (랜딩) — 스크린샷 `landing-ink.png`
2. `http://localhost:3000/login` — `login-ink.png`
3. 브라우저에서 `document.documentElement.dataset.accent = 'vermilion'` 실행 후 같은 페이지 재캡처 — `landing-vermilion.png`, `login-vermilion.png`
4. 로그인 화면에서 계정 정보가 환경변수 등으로 제공되어 있지 않으면 보호 화면(대시보드 등) 캡처는 생략하고 보고서에 명시한다. **테스트 계정 생성이나 시드 데이터 삽입을 시도하지 않는다** (프로덕션 DB).

다크 모드: playwright의 `browser_run_code_unsafe`/emulation으로 `prefers-color-scheme: dark`를 에뮬레이션할 수 있으면 같은 4장을 다크로도 캡처(`*-dark.png`), 불가하면 생략하고 보고.

저장 위치: `$CLAUDE_JOB_DIR/tmp/accent-compare/`

- [ ] **Step 3: 시각 스모크 체크리스트**

캡처를 직접 보고 확인, 실패 시 해당 Task로 돌아가 수정:

- 배경이 종이색(`#F7F3EC`)이고 순백/회색이 아닐 것
- 그림자가 보이지 않을 것 (카드가 헤어라인으로 구분)
- 워드마크 "Readiary"가 부리 서체로 렌더될 것
- 파란 원색(`#3B82F6`)이 어디에도 없을 것
- vermilion 토글 시 강조 요소가 주홍으로 일괄 전환될 것

- [ ] **Step 4: dev 서버 종료 및 최종 검증**

```bash
kill %1 2>/dev/null
npx tsc --noEmit && npm test && npm run build
```

---

### Task 6: UI 가이드라인 문서 재작성

**Files:**
- Modify: `docs/ui-guidelines.md` (전체 교체)

**Interfaces:**
- Consumes: Task 1~4의 최종 토큰·컴포넌트
- Produces: 이후 Plan ③~⑦의 모든 UI 작업이 참조하는 규범 문서

- [ ] **Step 1: `docs/ui-guidelines.md` 전체를 다음으로 교체**

```markdown
# Readiary UI Guidelines — 먹과 종이

에디토리얼 디자인 시스템 규범. 시안: "먹과 종이" 아티팩트, 스펙 §6.
원칙: **문장이 주인공. 콘텐츠는 부리, 도구는 산세리프. 그림자 대신 헤어라인. 파랑은 잉크처럼 아껴서.**

## 색 (Colors)

모든 색은 `app/globals.css`의 CSS 변수를 Tailwind 토큰이 참조한다.
**라이트/다크는 변수가 자동 전환하므로 색상에 `dark:` 프리픽스를 쓰지 않는다.**

| 토큰 | 라이트 | 다크 | 용도 |
| --- | --- | --- | --- |
| `bg-paper` | `#F7F3EC` | `#1B1612` | 앱 바탕(종이) |
| `bg-card` | `#FDFBF7` | `#241E19` | 카드·입력 표면 |
| `bg-card-raised` | `#F2ECE1` | `#2E2721` | 눌린/돌출 표면 |
| `text-ink` | `#221E1A` | `#EAE2D6` | 기본 글 (먹) |
| `text-ink-sub` | `#6E665C` | `#9A8F81` | 보조 글 |
| `text-ink-faint` | `#A39A8D` | `#6E655A` | 흐린 글·플레이스홀더 |
| `text-ink-invert` | 카드색 | 종이색 | 먹 배경 위 글 |
| `border-hairline` | `#E3DCD0` | `#3A322A` | 기본 헤어라인 |
| `border-hairline-strong` | `#CFC5B4` | `#4A4036` | 강조 헤어라인(위계) |
| `*-accent` | `#2D5FB8` | `#85A9EC` | 강조(잉크). 아껴 쓴다 |
| `bg-accent-soft` | 잉크 7% | 잉크 7% | 강조 연한 배경 |
| `*-danger` / `*-success` | 가라앉힌 적갈/초록 | 밝힌 톤 | 상태 |

- 강조색 후보 B(주홍 `#C1441E`)는 `<html data-accent="vermilion">`으로 전환해 볼 수 있다. 확정 전까지 유지.
- 원색 Tailwind 팔레트(`blue-500`, `red-500` 등)와 하드코딩 hex 금지.

## 서체 (Typography)

2서체 체계. **책의 목소리는 부리, 나의 도구는 산세리프.**

- `font-serif` — 마루 부리(셀프호스팅, `app/fonts.ts`). 인용문, 책 제목, 워드마크, 회고 카피.
- `font-sans` — Pretendard. UI 크롬, 버튼, 라벨, 메타데이터. (기본값)

크기 토큰: `text-page-title`(24) `text-section-title`(18) `text-body`(15) `text-body-sm`(14) `text-button`(14) `text-caption`(12) `text-overline`(11) 그리고:

- `text-quote` — 20px/1.85. 인용 문장 전용(`font-serif`와 함께).
- `text-seal` — 10.5px/굵게/자간 0.16em. 날짜·상태 표식 전용.

## 표면 규칙 (Surfaces)

- **그림자 금지.** `shadow-*` 클래스를 쓰지 않는다. 위계는 헤어라인 굵기·톤(`hairline` → `hairline-strong`)과 배경 단차(`paper` → `card` → `card-raised`)로.
- 곡률은 절제: 카드 `rounded-md`(6px), 알약형(버튼·칩) `rounded-full`. 큰 라운드(`rounded-2xl` 이상) 지양.
- 기울어진 도장 박스(스탬프) 장식 금지. 날짜 표식은 `<Seal>` 컴포넌트. 한자 장식(讀 등)은 허용.
- 이모지 장식 지양.

## 프리미티브 (components/ui)

| 컴포넌트 | 요지 |
| --- | --- |
| `Button` | 알약형. primary=먹 배경, secondary=헤어라인 아웃라인, ghost/danger/success |
| `Card` | 헤어라인 카드. `raised`는 진한 헤어라인(그림자 없음) |
| `Input`/`Textarea` | 카드 표면 + strong 헤어라인, 포커스에 accent 1px |
| `Modal` | `bg-ink/30` 스크림 + 헤어라인 패널 |
| `Tabs` | 밑줄형, 활성=accent |
| `Seal` | 잉크색 날짜/상태 라벨 ("1년 전 오늘", "완독") |
| `Chip` | 알약형 선택 칩, `dot`으로 잉크 점 |
| `Avatar` | card-raised 배경 + 헤어라인 |

## 다크 모드

어두운 종이. OS 설정 따름(`darkMode: 'media'`), 앱 내 토글 없음.
토큰이 자동 전환하므로 **컴포넌트 코드에는 다크 분기가 없어야 정상**이다. `dark:`가 필요하다고 느껴지면 토큰 선택이 잘못된 것.

## 아이콘

lucide-react 단일. `strokeWidth={1.75}` 권장. react-icons 금지(의존성 제거됨).
```

- [ ] **Step 2: 커밋**

```bash
git add docs/ui-guidelines.md
git commit -m "📝 docs(ui): 먹과 종이 가이드라인으로 재작성"
```

---

## 후속 플랜 연결

- Plan ③ 기록 플로우 — `Chip`·`Textarea`·`Seal`을 조합한 입력창(composer), 저장 후 확장
- Plan ④ 홈·회고 — 회상 카드(`Card variant="raised"` + `Seal` + `font-serif text-quote`), 주간 리듬
- Plan ⑤ 소셜·공유 — 문장 카드 컴포넌트·공유 이미지(4:5)·동적 OG가 이 토큰을 그대로 사용
- 강조색 확정(잉크 vs 주홍)은 Task 5의 비교 스크린샷으로 사용자가 결정 → 확정 시 `data-accent` 오버라이드 제거 여부 결정
- 랜딩 페이지 재작성·manifest themeColor·이모지 카피 일괄 정리는 Plan ⑦
