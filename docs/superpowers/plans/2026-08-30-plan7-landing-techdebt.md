# Plan ⑦ — 랜딩·기술부채 마무리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 랜딩 페이지를 "먹과 종이" 디자인 시스템으로 재작성하고, 깨진 lint 파이프라인·구 manifest·이모지/shadow 잔재·죽은 의존성을 정리한다.

**Architecture:** 4개 독립 태스크. ① lint 파이프라인 복구(스크립트·flat config·husky·CI), ② 랜딩 재작성(+signup 죽은 클래스), ③ manifest·아이콘·정적 자산·next.config 정리, ④ 이모지·shadow 스윕 + 의존성 제거. DB·마이그레이션 없음, 전부 프론트/설정 작업.

**Tech Stack:** Next.js 16(App Router, `--webpack`), Tailwind 3(CSS 변수 토큰), ESLint 9 flat config, husky 9 + lint-staged, sips(macOS 이미지 처리).

**Spec:** `docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md` §6(디자인 시스템 — "미정의 토큰과 하드코딩 색상 전부 정리. 랜딩 페이지는 새 시스템으로 재작성"), §11(로드맵 8. 랜딩·기술부채 마무리). 참고: `docs/ui-guidelines.md`.

## Global Constraints

- 색·텍스트는 토큰만: `text-ink`/`text-ink-sub`/`text-ink-faint`/`text-ink-invert`, `bg-paper`/`bg-card`/`bg-card-raised`, `border-hairline`/`border-hairline-strong`, `accent`. `text-ink-muted`·`text-muted-foreground`·`text-foreground`·`bg-primary`는 **존재하지 않는 죽은 클래스** — 쓰지 말 것.
- 색상에 `dark:` 프리픽스 금지(CSS 변수가 자동 전환). `shadow-*` 클래스 금지. 신규 코드 이모지 금지. 아이콘은 lucide-react 단일(`strokeWidth={1.75}`).
- 하드코딩 hex 금지. 예외: `public/manifest.json`(CSS 변수 불가 — 라이트 종이색 `#F7F3EC` 사용).
- 게이트(각 태스크 커밋 전): `npx tsc --noEmit` && `npx vitest run`. Task 1 완료 이후 태스크는 `npx eslint .`(오류 0)도 포함. Task 3은 `npm run build`도 실행(설정 변경 태스크).
- `npm run lint`는 Task 1 전까지 깨져 있음(`next lint`가 Next 16에서 제거됨) — Task 1 전에는 실행하지 말 것.
- 커밋 메시지: gitmoji + 한국어 제목 + 트레일러 2줄(`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, `Claude-Session: https://claude.ai/code/session_01LzJkS8Sn7uLvvMhjrzViEJ`).
- `public/sw.js`·`public/workbox-*.js`·`.DS_Store`는 git 미추적 로컬 잔재 — 건드리지 말 것(워크트리엔 없음).

---

### Task 1: lint 파이프라인 복구

**Files:**
- Modify: `package.json` (scripts 2곳, devDependencies 1곳)
- Modify: `eslint.config.mjs` (전체 교체)
- Delete: `.eslintrc.js`
- Create: `.husky/pre-commit`
- Modify: `.github/workflows/lighthouse-ci.yml` (lint 단계 추가)

**Interfaces:**
- Consumes: 없음
- Produces: `npx eslint .`이 오류 0으로 동작(이후 태스크의 게이트), `npm run lint` 복구

**배경:** Next 16이 `next lint`를 제거해 `npm run lint`가 "Invalid project directory" 오류로 죽음. ESLint 9는 flat config(`eslint.config.mjs`)만 읽어 legacy `.eslintrc.js`의 규칙 2개가 죽어 있음. flat config에 `ignores`가 없어 `eslint .`이 로컬 잔재(`public/sw.js` 등)까지 훑으면 3.1만 오류. husky는 `.husky/_`만 있고 pre-commit 훅 파일이 없어 lint-staged가 한 번도 실행된 적 없음. `eslint-config-next`(15.3.4)는 next(16.1.6)와 메이저 불일치. **소스 코드 자체는 현재 lint 오류 0건 확인됨.**

- [ ] **Step 1: package.json 수정**

scripts에서:
```json
"lint": "eslint .",
"prepare": "husky",
```
(`"lint": "next lint"` 교체, `"husky": "husky install"` 삭제 후 `"prepare": "husky"` 추가 — husky 9 관례)

devDependencies에서:
```json
"eslint-config-next": "16.1.6",
```

- [ ] **Step 2: eslint.config.mjs 전체 교체**

```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'public/**',
      '.claude/**',
      '.superpowers/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

export default eslintConfig;
```

(`.eslintrc.js`의 규칙 이식. `no-console`은 `console.error`가 fire-and-forget 관례로 의도적 사용되므로 warn/error 허용으로 완화 — 컨트롤러 룰링.)

- [ ] **Step 3: .eslintrc.js 삭제** (`git rm .eslintrc.js`)

- [ ] **Step 4: .husky/pre-commit 생성**

파일 내용(1줄):
```
npx lint-staged
```
`chmod +x .husky/pre-commit` 실행.

- [ ] **Step 5: npm install** (eslint-config-next 16.1.6 반영, package-lock.json 갱신)

- [ ] **Step 6: CI에 lint 단계 추가**

`.github/workflows/lighthouse-ci.yml`의 `Run unit tests` 단계 다음에:
```yaml
      - name: Lint
        run: npx eslint .
```

- [ ] **Step 7: 검증**

`npx eslint .` → 오류 0(경고는 허용, 개수 보고). eslint-config-next 16 승격으로 새 오류가 나오면 해당 코드를 수정(규칙 비활성화 금지, 수정 불가 판단 시 보고). `npx tsc --noEmit` && `npx vitest run` 통과. `npx lint-staged --help`가 동작하는지 확인.

- [ ] **Step 8: Commit** — `🔧 fix(lint): Next 16에서 깨진 lint 파이프라인 복구 — eslint CLI 전환·flat config 단일화·husky 훅 복구`

---

### Task 2: 랜딩 페이지 재작성 + signup 죽은 클래스 정리

**Files:**
- Modify: `app/page.tsx` (전체 재작성)
- Delete: `app/page.module.css` (참조 0건 죽은 파일)
- Modify: `app/signup/page.tsx:85,108,127,159,212` (`text-muted-foreground` → `text-ink-sub`)

**Interfaces:**
- Consumes: `Button`(`components/ui/Button.tsx`, default export, `asChild`/`variant`/`size` props), `Seal`(`components/ui/Seal.tsx`, default export), `createSupabaseServerClient`(`lib/supabase/server`)
- Produces: 없음(리프 페이지)

**배경:** 현 랜딩은 죽은 shadcn 클래스(`text-foreground`, `text-muted-foreground` ×6, `bg-primary`)와 이모지 6개, 제거된 기능(업적·뱃지) 카피, `<Link><button>` 중첩 마크업을 가진 구 디자인. 루트 레이아웃의 `max-w-screen-md` 래퍼 안에서 렌더되므로 **풀블리드 스크롤 스택을 버리고 편집형(에디토리얼) 1열 지면으로 재작성**한다(라우트 그룹 재배치는 하지 않는다 — 컨트롤러 룰링: 먹과 종이 미학은 종이 지면형 랜딩과 부합하고, 전 라우트 이동은 리스크 대비 이득 없음). 로그인 리다이렉트 로직은 유지. 카피는 현재 제품(문장 중심 기록·회고·친구 공유)을 반영하고 뱃지·통계 문구는 제거.

- [ ] **Step 1: app/page.tsx 전체 교체**

```tsx
// app/page.tsx

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Button from '@/components/ui/Button';
import Seal from '@/components/ui/Seal';

const FEATURES = [
  {
    label: '문장',
    heading: '옮겨 적는 것으로 충분해요',
    body: '길게 쓰지 않아도 됩니다. 오늘 마음에 남은 문장 하나를 옮겨 적는 것이 기록의 시작이에요. 생각이 이어지면 그때 덧붙이면 됩니다.',
  },
  {
    label: '회고',
    heading: '지난 문장이 돌아옵니다',
    body: '지난날 적어 둔 문장이 회상 카드로 돌아오고, 완독한 책은 한 권의 발췌집이 됩니다. 매월 첫날엔 지난달의 기록을 돌아봐요.',
  },
  {
    label: '함께',
    heading: '친구의 문장에 마음을 남겨요',
    body: '친구가 옮겨 적은 문장을 피드에서 만나고, 좋아요와 댓글로 마음을 보태세요. 아끼는 문장은 카드로 만들어 공유할 수 있어요.',
  },
];

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/protected/dashboard');
  }

  return (
    <div className="flex flex-col gap-16 py-8 md:gap-24 md:py-14">
      <section className="flex flex-col items-center pt-10 text-center md:pt-16">
        <span aria-hidden className="font-serif text-4xl text-ink-faint">
          讀
        </span>
        <h1 className="mt-6 font-serif text-3xl font-bold leading-snug text-ink md:text-4xl">
          하루 한 문장이면
          <br />
          충분한 독서 기록
        </h1>
        <p className="mt-5 text-body leading-relaxed text-ink-sub">
          오늘 마음에 남은 문장 하나를 옮겨 적으세요.
          <br />
          문장이 쌓여 책장이 되고, 회고가 됩니다.
        </p>
        <div className="mt-9 flex gap-3">
          <Button asChild size="lg">
            <Link href="/signup">시작하기</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/login">로그인</Link>
          </Button>
        </div>
      </section>

      <section aria-label="기록 예시">
        <figure className="rounded-md border border-hairline bg-card px-6 py-8 md:px-10 md:py-10">
          <blockquote className="font-serif text-quote text-ink">
            “책은 우리 안의 얼어붙은 바다를 깨는 도끼여야 한다.”
          </blockquote>
          <figcaption className="mt-5 flex items-baseline justify-between gap-4">
            <span className="text-caption text-ink-sub">프란츠 카프카, 1904년의 편지에서</span>
            <Seal>오늘의 문장</Seal>
          </figcaption>
        </figure>
      </section>

      <section className="flex flex-col gap-4 md:flex-row">
        {FEATURES.map((feature) => (
          <article
            key={feature.label}
            className="flex-1 rounded-md border border-hairline bg-card p-6"
          >
            <p className="text-overline text-accent">{feature.label}</p>
            <h2 className="mt-3 font-serif text-section-title text-ink">{feature.heading}</h2>
            <p className="mt-3 text-body-sm leading-relaxed text-ink-sub">{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col items-center border-t border-hairline pt-12 text-center md:pt-16">
        <p className="font-serif text-section-title text-ink">오늘의 문장부터 시작해 보세요</p>
        <p className="mt-3 text-body-sm text-ink-sub">가입은 이메일 하나면 충분합니다.</p>
        <div className="mt-7">
          <Button asChild size="lg">
            <Link href="/signup">Readiary 시작하기</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: app/page.module.css 삭제** (`git rm app/page.module.css`)

- [ ] **Step 3: app/signup/page.tsx의 `text-muted-foreground` 5곳(85,108,127,159,212행 부근)을 `text-ink-sub`로 교체.** 다른 변경 금지.

- [ ] **Step 4: 검증** — `npx tsc --noEmit` && `npx vitest run` && `npx eslint .` 통과. `npm run build` 통과 확인(이 태스크는 페이지 재작성이므로 build까지 — `/`는 auth 조회로 동적 렌더).

- [ ] **Step 5: Commit** — `🎨 feat(landing): 랜딩을 먹과 종이 편집형 지면으로 재작성 — 죽은 shadcn 클래스·뱃지 카피 제거`

---

### Task 3: manifest·아이콘·정적 자산·next.config 정리

**Files:**
- Modify: `public/manifest.json` (전체 교체)
- Create: `public/icons/icon-192x192-maskable.png`, `public/icons/icon-512x512-maskable.png` (sips로 생성)
- Delete: `public/images/default-badge.png`(1.4MB, 뱃지 기능 제거됨·참조 0건), `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg` (전부 참조 0건 — 컨트롤러가 grep으로 확인함)
- Modify: `public/images/default-book-cover.png` (1024²·1.27MB → 512²로 축소, 참조 8곳 전부 소형 렌더)
- Modify: `app/layout.tsx:30-38` (head 정리)
- Modify: `next.config.ts:26-28` (no-op webpack 훅 삭제)

**Interfaces:**
- Consumes: 없음
- Produces: manifest 아이콘 경로(레이아웃 head와 일치해야 함)

**배경:** manifest가 구 디자인(slate `#0f172a`·흰 배경)에 머물러 `app/layout.tsx`의 `viewport.themeColor`(`#F7F3EC`/`#1B1612`)와 모순. maskable 아이콘이 없어 안드로이드 설치 시 아이콘이 잘림. head에 manifest 링크가 metadata와 중복 선언되고 `<link rel="icon" href="favicon.ico">`는 선행 슬래시 누락으로 상대경로. 파일 맨 앞에 빈 줄 2개.

- [ ] **Step 1: public/manifest.json 전체 교체** (앞 빈 줄 제거 포함)

```json
{
  "name": "Readiary",
  "short_name": "Readiary",
  "description": "하루 한 문장 독서 기록",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F7F3EC",
  "theme_color": "#F7F3EC",
  "icons": [
    {
      "src": "/icons/icon-192x192-v2.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512-v2.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192-maskable.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-512x512-maskable.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 2: maskable 아이콘 생성** (기존 아이콘을 80%로 축소 후 종이색으로 패딩 — maskable safe zone 확보)

```bash
cp public/icons/icon-512x512-v2.png public/icons/_tmp-512.png
sips --resampleHeightWidth 410 410 public/icons/_tmp-512.png --out public/icons/_tmp-512s.png
sips --padToHeightWidth 512 512 --padColor F7F3EC public/icons/_tmp-512s.png --out public/icons/icon-512x512-maskable.png
cp public/icons/icon-192x192-v2.png public/icons/_tmp-192.png
sips --resampleHeightWidth 154 154 public/icons/_tmp-192.png --out public/icons/_tmp-192s.png
sips --padToHeightWidth 192 192 --padColor F7F3EC public/icons/_tmp-192s.png --out public/icons/icon-192x192-maskable.png
rm public/icons/_tmp-*.png
```

생성 후 `sips -g pixelWidth -g pixelHeight`로 512/192 확인.

- [ ] **Step 3: default-book-cover.png 축소**

```bash
sips --resampleHeightWidth 512 512 public/images/default-book-cover.png
```

(참조 8곳 전부 커버 썸네일 크기로 렌더 — 512²면 충분. 파일 크기가 300KB 이하로 줄었는지 확인.)

- [ ] **Step 4: 미사용 자산 삭제**

```bash
git rm public/images/default-badge.png public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

- [ ] **Step 5: app/layout.tsx head 정리** — `<head>` 블록을 아래로 교체(중복 manifest 링크·깨진 favicon 링크·중복 icon 링크 제거; manifest는 `metadata.manifest`가, favicon은 `app/favicon.ico`가 자동 처리):

```tsx
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192-v2.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
```

- [ ] **Step 6: next.config.ts에서 no-op `webpack: (config) => config` 훅(26-28행)과 딸린 주석 삭제.** images.remotePatterns 등 다른 설정은 건드리지 말 것.

- [ ] **Step 7: 검증** — `npx tsc --noEmit` && `npx vitest run` && `npx eslint .` && `npm run build` 통과. 브라우저 검증은 하지 않음(정적 파일).

- [ ] **Step 8: Commit** — `📱 fix(pwa): manifest를 종이 팔레트로 갱신·maskable 아이콘 추가, 미사용 자산 정리`

---

### Task 4: 이모지·shadow 스윕 + 죽은 의존성 제거

**Files:**
- Modify: 아래 표의 파일들(이모지 제거), `components/books/BookDetailContent.tsx`, `components/entry/EntryDetailContent.tsx`, `components/profile/ProfileStats.tsx`(shadow), `components/Navbar.tsx:6`(import), `package.json`(dependencies 4개 제거)

**Interfaces:**
- Consumes: 없음
- Produces: 없음

**배경:** 가이드라인 "이모지 장식 지양"·"그림자 금지" 위반 잔재 일괄 정리 + 참조 0건 의존성 제거. **Task 2가 재작성하는 `app/page.tsx`와 `app/signup/page.tsx`는 이 태스크 범위에서 제외**(이미 처리됨).

- [ ] **Step 1: 장식 이모지 제거** (제목/라벨 앞 이모지와 뒤따르는 공백 1개를 지우고 텍스트만 남긴다. 문장 끝 이모지는 이모지만 제거. 라인 번호는 근사치 — 실제 위치를 확인하고 수정할 것)

| 파일 | 위치(근사) | 이모지 |
| --- | --- | --- |
| `app/protected/profile/page.tsx` | 36 | 👤 |
| `app/protected/books/page.tsx` | 18, 28 | 📚, 📭 |
| `app/protected/books/new/page.tsx` | 17, 22, 23 | 📗, 🔍, ✍️ |
| `app/protected/social/page.tsx` | 40 | 🌏 |
| `app/protected/social/u/[nicknameAndTag]/page.tsx` | 48 | 👤 |
| `app/protected/social/_components/SocialTab.tsx` | 110 | 🔍 |
| `app/protected/social/_components/FriendRequestForm.tsx` | 101 | ➕ |
| `app/protected/social/_components/DetailSocialFeedItem.tsx` | 153 | 📖 |
| `app/protected/dashboard/_components/GreetingHeader.tsx` | 8 | 👋 |
| `app/protected/dashboard/_components/NoBooksSection.tsx` | 13 | 📚 |
| `app/reset-password/page.tsx` | 76 | 📧 |
| `app/protected/entry/[entry_id]/not-found.tsx` | 12 | 😕 |
| `app/protected/dashboard/not-found.tsx` | 12 | 😕 |
| `app/protected/books/[book_id]/not-found.tsx` | 12 | 📚 |
| `components/entry/EntryDetailContent.tsx` | 120, 178, 182 | ✍️, 📅, 📖 |
| `components/books/BookDetailContent.tsx` | 173 | 📓 |
| `components/profile/ProfileBookshelf.tsx` | 30 | 📚 |
| `components/profile/ProfileStats.tsx` | 51 | 📊 |
| `components/comments/CommentSection.tsx` | 140, 149 | 💬, 👈(주석 안 — 주석 정리) |
| `components/comments/CommentBottomSheet.tsx` | 157 | 💬 |
| `components/comments/CommentInput.tsx` | 64 | ✍️(placeholder) |

`→`·`✓` 같은 타이포그래피 문자는 이모지가 아님 — 남긴다.

- [ ] **Step 2: shadow 잔재 제거 + 커버 이미지 sizes 추가**

- `components/books/BookDetailContent.tsx:85`: `rounded shadow object-cover` → `rounded object-cover`. 해당 `<Image>`가 `fill`이고 `sizes`가 없으면 `sizes="(min-width: 640px) 96px, 128px"` 추가(렌더 폭 `w-32 sm:w-24` 기준).
- `components/books/BookDetailContent.tsx:87`: `<div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />` 줄 삭제(구 다크 UI 잔재·하드코딩 white).
- `components/entry/EntryDetailContent.tsx:104`: `shadow` 클래스 제거. 같은 `<Image>`에 `sizes`가 없으면 실제 렌더 폭을 확인해 맞는 값 추가.
- `components/profile/ProfileStats.tsx:60`: `'scale-95 !shadow-none !border-hairline-strong'` → `'scale-95 !border-hairline-strong'` (`Card`가 그림자를 안 쓰므로 `!shadow-none`은 무의미).

- [ ] **Step 3: 죽은 의존성 제거**

- `components/Navbar.tsx:6`: `import type { User } from '@supabase/auth-helpers-nextjs';` → `import type { User } from '@supabase/supabase-js';`
- `package.json` dependencies에서 4개 제거: `@supabase/auth-helpers-nextjs`(위 타입 1개만 사용 중이었음), `@types/minimatch`(사용처 0), `ts-prune`(사용처·스크립트 0), `unimported`(사용처·스크립트 0)
- `npm install`로 package-lock.json 갱신

- [ ] **Step 4: 검증** — `npx tsc --noEmit` && `npx vitest run` && `npx eslint .` 통과. `grep -rn "auth-helpers" app components lib` 결과 0건 확인.

- [ ] **Step 5: Commit** — `🧹 chore(design): 이모지·shadow 잔재 일괄 제거, 죽은 의존성 4개 정리`

---

## 최종 검증 (전 태스크 완료 후)

- `npx tsc --noEmit` && `npx vitest run` && `npx eslint .` && `npm run build` 전부 통과.
- `grep -rn "muted-foreground\|text-foreground\|bg-primary" app components` → 0건.
- `grep -rn "shadow" app components --include="*.tsx"` → 0건(클래스 기준).
