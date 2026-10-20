# 주소 정리(`/protected` 빼기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 화면의 주소에서 `/protected`를 빼고(오늘은 `/today`), 옛 주소는 영구 이동(308)으로 새 주소에 이어 준다.

**Architecture:** `app/protected/*`를 라우트 그룹 `app/(app)/*`로 옮겨 주소에서 접두사를 없앤다. 로그인 필요 여부는 `lib/routes.ts`의 주소 목록 하나로 판단하고 `proxy.ts`가 그것을 쓴다. 옛 주소 이동은 `next.config.ts`의 `redirects()`가 맡으며, 이 규칙은 proxy보다 먼저 실행된다.

**Tech Stack:** Next.js 16 App Router(webpack), TypeScript, Vitest, Supabase(PostgreSQL), next-pwa 서비스 워커.

**Spec:** `docs/superpowers/specs/2026-10-20-diary-vellum-redesign-design.md` 1절

## Global Constraints

- 대상 브랜치: `main`(새 디자인 `redesign` 브랜치보다 먼저). 작업 브랜치 `chore/route-cleanup`, 별도 worktree.
- 새 주소: `/today`, `/books/…`, `/entry/…`, `/profile/…`, `/social/…`, `/search`, `/notifications/…`. 로그인 필요 주소 목록: `/today`, `/books`, `/entry`, `/profile`, `/settings`, `/social`, `/search`, `/notifications`, `/pilsa`.
- 옛 주소 이동은 영구(308): `/protected/dashboard` → `/today`, `/protected/:path*` → `/:path*`. 새 디자인 배포 뒤에도 남긴다.
- 서버 인증(`getServerUser`)과 RLS는 그대로. 개인화 응답 캐시 금지 규칙(`lib/pwa/runtime-caching.ts`)은 경로 기반이 아니므로 바꾸지 않는다.
- `config.matcher`는 Next가 정적으로 읽으므로 **리터럴 배열**이어야 한다(상수 import 불가).
- 과거 기록 문서(`docs/superpowers/specs|plans/2026-08~09*`, `docs/qa/*`)의 주소는 고치지 않는다.
- 커밋 메시지·PR은 행동의 언어로, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 로그인 안 한 채 쿼리 붙은 새 주소(`/books?sort=recent`)를 열면 로그인 화면으로 가고 `redirect`에 원래 주소가 그대로 실린다 → Task 2 테스트.
2. 옛 주소에 쿼리가 붙어 와도(`/protected/social?invite=x`) 쿼리를 잃지 않고 308로 새 주소에 간다 → Task 1 테스트(규칙 형태) + Task 5 수동 확인(Next가 쿼리를 보존).
3. 우연히 접두사가 같은 주소(`/todayx`, `/bookstore`)는 로그인 검사 대상이 아니다 → Task 1·2 테스트.
4. 로그인 후 돌아갈 주소가 옛 형식(`/protected/…`, 메일·메타데이터에 남은 값)이어도 결국 새 화면에 닿는다 → Task 1 테스트(sanitize가 통과시키고 이동 규칙이 받는다) + Task 5 수동 확인.
5. 설치형 PWA에서 알림을 누르면 새 주소의 알림함이 열린다 → Task 4 테스트.

---

## File Structure

- Create `lib/routes.ts` — 앱 화면 주소의 단일 출처: `HOME_PATH`, `APP_ROUTE_PREFIXES`, `isAppRoute()`, `LEGACY_REDIRECTS`.
- Create `lib/__tests__/routes.test.ts`.
- Modify `next.config.ts` — `redirects()`에서 `LEGACY_REDIRECTS` 사용.
- Modify `proxy.ts` — `isAppRoute()`·`HOME_PATH` 사용, matcher 리터럴 갱신.
- Modify `lib/auth/safeRedirect.ts`, `lib/auth/oauthRedirect.ts`, `app/auth/confirm/route.ts` — 기본 주소를 `HOME_PATH`로.
- Move `app/protected/**` → `app/(app)/**`, `app/(app)/dashboard` → `app/(app)/today`.
- Modify 앱 안 링크 문자열(약 70곳, `app` `components` `lib` `hooks`).
- Modify `worker/index.js`, `lib/push/send.ts` — 알림함 주소.
- Create `supabase/migrations/20261021090000_push_hrefs_without_protected.sql` — `push_candidates` 재정의.
- Modify `AGENTS.md`, `docs/notifications/web-push.md`, `docs/operations/library-search.md`, `README.md`의 현재 경로 설명.

---

### Task 1: 주소 목록 모듈과 옛 주소 이동 규칙

**Files:**
- Create: `lib/routes.ts`
- Create: `lib/__tests__/routes.test.ts`
- Modify: `next.config.ts`
- Modify: `lib/auth/safeRedirect.ts:1`, `lib/auth/oauthRedirect.ts:3`, `app/auth/confirm/route.ts:9`

**Interfaces:**
- Produces:
  - `HOME_PATH: '/today'`
  - `APP_ROUTE_PREFIXES: readonly string[]`
  - `isAppRoute(pathname: string): boolean`
  - `LEGACY_REDIRECTS: { source: string; destination: string; permanent: true }[]`

- [ ] **Step 1: worktree와 브랜치 만들기**

```bash
cd /Users/drchasekim/Developer/readiary
git fetch origin main
git worktree add .claude/worktrees/chore+route-cleanup -b chore/route-cleanup origin/main
cd .claude/worktrees/chore+route-cleanup
npm ci
```

- [ ] **Step 2: 실패하는 테스트 작성** — `lib/__tests__/routes.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PREFIXES, HOME_PATH, LEGACY_REDIRECTS, isAppRoute } from '../routes';
import { sanitizeRedirectPath } from '../auth/safeRedirect';

describe('app routes', () => {
  it('home is /today', () => {
    expect(HOME_PATH).toBe('/today');
  });

  it('matches each prefix exactly and its children', () => {
    for (const prefix of APP_ROUTE_PREFIXES) {
      expect(isAppRoute(prefix)).toBe(true);
      expect(isAppRoute(`${prefix}/x/y`)).toBe(true);
    }
  });

  it('does not match look-alike prefixes or public pages', () => {
    for (const path of ['/todayx', '/bookstore', '/entryway', '/', '/login', '/share/e/1', '/invite/a-1']) {
      expect(isAppRoute(path)).toBe(false);
    }
  });

  it('covers the spec list', () => {
    expect([...APP_ROUTE_PREFIXES].sort()).toEqual(
      ['/books', '/entry', '/notifications', '/pilsa', '/profile', '/search', '/settings', '/social', '/today'].sort()
    );
  });
});

describe('legacy redirects', () => {
  it('sends the old dashboard to /today before the generic rule', () => {
    expect(LEGACY_REDIRECTS).toEqual([
      { source: '/protected', destination: '/today', permanent: true },
      { source: '/protected/dashboard/:path*', destination: '/today/:path*', permanent: true },
      { source: '/protected/:path*', destination: '/:path*', permanent: true },
    ]);
  });

  it('an old-style return path still passes sanitizing (the redirect rule then takes it)', () => {
    expect(sanitizeRedirectPath('/protected/social?invite=x')).toBe('/protected/social?invite=x');
    expect(sanitizeRedirectPath(null)).toBe('/today');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run lib/__tests__/routes.test.ts`
Expected: FAIL — `Cannot find module '../routes'`

- [ ] **Step 4: 구현** — `lib/routes.ts`

```ts
/** 로그인한 사람의 앱 화면 주소 — proxy 로그인 검사, 기본 착지, 옛 주소 이동이 모두 이 파일을 따른다. */

export const HOME_PATH = '/today';

/** 로그인이 필요한 화면의 첫 마디. 새 화면을 만들면 여기와 proxy.ts의 matcher에 함께 더한다. */
export const APP_ROUTE_PREFIXES = [
  '/today',
  '/books',
  '/entry',
  '/profile',
  '/settings',
  '/social',
  '/search',
  '/notifications',
  '/pilsa',
] as const;

/** `/books`와 `/books/…`는 앱 화면, `/bookstore` 같은 우연한 접두사는 아니다 */
export function isAppRoute(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * 2026-10 이전 주소(/protected/…) → 새 주소. 설치된 PWA의 시작 주소, 보낸 알림·이메일 링크, 북마크,
 * DB에 남은 푸시 주소가 깨지지 않도록 계속 둔다. 위에서부터 먼저 맞는 규칙이 쓰인다(쿼리는 Next가 보존).
 */
export const LEGACY_REDIRECTS = [
  { source: '/protected', destination: '/today', permanent: true },
  { source: '/protected/dashboard/:path*', destination: '/today/:path*', permanent: true },
  { source: '/protected/:path*', destination: '/:path*', permanent: true },
] as const satisfies readonly { source: string; destination: string; permanent: true }[];
```

`lib/auth/safeRedirect.ts` 1행:

```ts
import { HOME_PATH } from '@/lib/routes';

export const DEFAULT_REDIRECT_PATH = HOME_PATH;
```

`lib/auth/oauthRedirect.ts` 3행 `const DEFAULT_REDIRECT = '/protected/dashboard';` →

```ts
import { DEFAULT_REDIRECT_PATH as DEFAULT_REDIRECT } from '@/lib/auth/safeRedirect';
```

(같은 파일 1행의 `sanitizeRedirectPath` import와 합쳐 `import { DEFAULT_REDIRECT_PATH as DEFAULT_REDIRECT, sanitizeRedirectPath } from '@/lib/auth/safeRedirect';` 한 줄로)

`app/auth/confirm/route.ts` 9행 `const DEFAULT_NEXT = '/protected/dashboard';` →

```ts
const DEFAULT_NEXT = DEFAULT_REDIRECT_PATH;
```

그리고 4행 import를 `import { DEFAULT_REDIRECT_PATH, sanitizeRedirectPath } from '@/lib/auth/safeRedirect';`로.

`next.config.ts`의 `nextConfig`에 추가(상단 import 포함):

```ts
import { LEGACY_REDIRECTS } from './lib/routes';
// …
const nextConfig: NextConfig = {
  // 옛 /protected 주소는 proxy보다 먼저 새 주소로 영구 이동한다 — lib/routes.ts
  async redirects() {
    return [...LEGACY_REDIRECTS];
  },
  images: {
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run lib/__tests__/routes.test.ts`
Expected: PASS

Run: `npx vitest run lib/auth app/auth`
Expected: 기본 주소 기대값(`/protected/dashboard`)을 가진 테스트가 FAIL — Task 3에서 일괄로 고친다. 다른 실패가 없는지만 본다.

- [ ] **Step 6: 커밋**

```bash
git add lib/routes.ts lib/__tests__/routes.test.ts next.config.ts lib/auth/safeRedirect.ts lib/auth/oauthRedirect.ts app/auth/confirm/route.ts
git commit -m "feat: 옛 /protected 주소로 들어와도 새 주소로 이어진다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: proxy 로그인 검사를 주소 목록으로

**Files:**
- Modify: `proxy.ts:83-135`
- Modify: `lib/auth/__tests__/proxy.test.ts`

**Interfaces:**
- Consumes: `isAppRoute`, `HOME_PATH`, `APP_ROUTE_PREFIXES` (Task 1)

- [ ] **Step 1: 실패하는 테스트 추가** — `lib/auth/__tests__/proxy.test.ts`의 `describe` 끝에

```ts
  it('sends a logged-out visitor of a new app route to login, keeping the full return path', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/books?sort=recent'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://readiary.test/login?redirect=%2Fbooks%3Fsort%3Drecent'
    );
  });

  it('does not guard look-alike public paths', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/bookstore'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends a finished onboarding to /today', async () => {
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/onboarding'));
    expect(response.headers.get('location')).toBe('https://readiary.test/today');
  });

  it('matcher lists every app route literally', async () => {
    const { config } = await import('../../../proxy');
    const { APP_ROUTE_PREFIXES } = await import('../../routes');
    for (const prefix of APP_ROUTE_PREFIXES) {
      expect(config.matcher).toContain(`${prefix}/:path*`);
    }
    expect(config.matcher).not.toContain('/protected/:path*');
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/auth/__tests__/proxy.test.ts`
Expected: 새 테스트 4개 FAIL(`/books`는 검사 대상이 아니고, 온보딩 이후 주소가 `/protected/dashboard`, matcher에 새 주소 없음)

- [ ] **Step 3: 구현** — `proxy.ts`

상단 import에 추가:

```ts
import { HOME_PATH, isAppRoute } from '@/lib/routes';
```

비로그인 분기(현재 83~98행)를 바꾼다:

```ts
  const { pathname } = request.nextUrl;
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    (isAppRoute(pathname) || pathname.startsWith('/onboarding'))
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (isAppRoute(pathname)) {
      url.searchParams.set('redirect', pathname + request.nextUrl.search);
    }
    return redirectWithAuthCookies(url);
  }
```

온보딩 완료 분기(현재 110~114행)의 `url.pathname = '/protected/dashboard';` → `url.pathname = HOME_PATH;`

matcher(현재 135행):

```ts
  // 리터럴이어야 한다(Next가 정적으로 읽는다) — lib/routes.ts의 APP_ROUTE_PREFIXES와 맞춘다(테스트가 확인)
  matcher: [
    '/',
    '/login',
    '/signup',
    '/onboarding/:path*',
    '/invite/:path*',
    '/today/:path*',
    '/books/:path*',
    '/entry/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/social/:path*',
    '/search/:path*',
    '/notifications/:path*',
    '/pilsa/:path*',
  ],
```

기존 테스트의 `request('/protected/…')`는 Task 3에서 일괄 변환된다. 지금은 기존 5개 중 `/protected/books?sort=recent` 기대값 테스트가 실패해도 된다.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/auth/__tests__/proxy.test.ts -t "new app route|look-alike|finished onboarding|matcher"`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add proxy.ts lib/auth/__tests__/proxy.test.ts
git commit -m "feat: 로그인이 필요한 화면을 새 주소 목록으로 지킨다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 화면 폴더 이동과 앱 안 링크 일괄 변경

**Files:**
- Move: `app/protected/**` → `app/(app)/**`, 그 안의 `dashboard` → `today`
- Modify: `app` `components` `lib` `hooks` 아래 `/protected` 문자열(테스트 포함)

**Interfaces:**
- Consumes: Task 1·2의 새 주소 체계. 이 태스크는 새 이름을 만들지 않는다.

- [ ] **Step 1: 폴더 이동**

```bash
git mv app/protected 'app/(app)'
git mv 'app/(app)/dashboard' 'app/(app)/today'
ls 'app/(app)'
```

Expected: `books entry error.tsx layout.tsx notifications profile search social today`

- [ ] **Step 2: import 경로와 주소 문자열 변환** (순서 중요: 구체적인 규칙 먼저)

```bash
# 옛 주소 자체를 다루는 파일(이동 규칙과 그 테스트, proxy 테스트)은 제외한다 — 바꾸면 이동 규칙이 망가진다
FILES=$(grep -rlE "protected" app components lib hooks --include='*.ts' --include='*.tsx' --include='*.js' \
  | grep -vE '^lib/routes\.ts$|^lib/__tests__/routes\.test\.ts$|^lib/auth/__tests__/proxy\.test\.ts$')
# proxy 테스트는 요청 주소만 바꾼다(matcher 테스트의 '/protected/:path*'는 그대로)
perl -pi -e "s#request\('/protected/dashboard'\)#request('/today')#g; s#request\('/protected/books#request('/books#g; s#%2Fprotected%2Fbooks#%2Fbooks#g" lib/auth/__tests__/proxy.test.ts
perl -pi -e '
  s#\@/app/protected/dashboard/#\@/app/(app)/today/#g;
  s#\@/app/protected/#\@/app/(app)/#g;
  s#/protected/dashboard#/today#g;
  s#%2Fprotected%2Fdashboard#%2Ftoday#g;
  s#%2Fprotected%2F#%2F#g;
  s#/protected/#/#g;
' $FILES
```

- [ ] **Step 3: 남은 `protected` 직접 확인**

Run: `grep -rn "protected" app components lib hooks proxy.ts worker --include='*.ts' --include='*.tsx' --include='*.js'`

Expected로 남는 것과 처리:
- `app/auth/callback/page.tsx` 주석 "예전엔 '/protected'로 보냈는데…" → 그대로 둔다(과거 사실).
- `components/Header.tsx` 17~19행 주석의 "/protected 를 미리" → "앱 화면을 미리"로 고친다.
- `lib/pwa/__tests__/runtime-caching.test.ts`의 `'/_next/data/build/protected.json'` → 그대로(경로 이름일 뿐).
- `worker/index.js` 두 곳 → Task 4에서.
- 그 밖의 것이 나오면 같은 규칙(옛 주소 → 새 주소)으로 고친다.

- [ ] **Step 4: `/protected` 루트 기대값 정리**

`app/auth/callback/page.tsx` 47행이 `'/today'`로 바뀌었는지 확인한다. `components/AppShell.tsx` 82~85행 프리페치 목록이 `['/today', '/books', '/social', '/profile']`인지 확인한다.

- [ ] **Step 5: 전체 검사**

Run: `npm test`
Expected: PASS(worker 관련 2개 제외 — `lib/push/__tests__/worker.test.ts`, `send.test.ts`가 아직 옛 주소면 Task 4에서). 그 외 실패가 있으면 변환 누락이니 고친다.

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: 성공. 라우트 목록에 `/today`, `/books`, `/books/[book_id]`, `/entry/[entry_id]`, `/social/u/[nicknameAndTag]` 등이 보이고 `/protected`로 시작하는 라우트가 없다.

- [ ] **Step 6: 커밋**

```bash
git add -A app components lib hooks
git commit -m "feat: 앱 화면 주소에서 /protected가 빠지고 오늘 화면은 /today가 된다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 알림 주소 — 서비스 워커, 푸시 발송, DB 함수

**Files:**
- Modify: `worker/index.js:16,23`
- Modify: `lib/push/send.ts:31`
- Modify: `lib/push/__tests__/worker.test.ts:37`, `lib/push/__tests__/send.test.ts:52`
- Create: `supabase/migrations/20261021090000_push_hrefs_without_protected.sql`

- [ ] **Step 1: 테스트 기대값을 먼저 새 주소로**

`lib/push/__tests__/worker.test.ts` 37행:

```ts
    expect(openWindow).toHaveBeenCalledWith('https://readiary.test/notifications/inbox');
```

`lib/push/__tests__/send.test.ts` 52행:

```ts
      url: '/notifications/inbox',
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/push`
Expected: 두 테스트 FAIL(아직 `/protected/notifications/inbox`)

- [ ] **Step 3: 구현**

`worker/index.js` 16행 `data: { url: '/notifications/inbox' },`, 23행 `self.clients.openWindow(new URL('/notifications/inbox', self.location.origin).href)`.
`lib/push/send.ts` 31행 `url: '/notifications/inbox',`.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/push`
Expected: PASS

- [ ] **Step 5: DB 함수 재정의 마이그레이션 작성**

`supabase/migrations/20261021090000_push_hrefs_without_protected.sql` — `20260907120231_web_push_reminders.sql`의 `push_candidates`(100~145행)를 그대로 옮기되 `href` 다섯 곳만 새 주소로. 시그니처·권한이 같으므로 `create or replace`이며 grant는 유지된다.

```sql
-- 2026-10 주소 정리: 푸시 알림이 여는 주소에서 /protected 를 뺀다.
-- 이미 보낸 알림의 옛 주소는 next.config.ts 의 영구 이동(308)이 새 주소로 잇는다.
create or replace function public.push_candidates(p_user uuid,p_now timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.push_preferences; result jsonb='[]'; last_record timestamptz; last_kind timestamptz; b record; recalled record; cutoff timestamptz; local_day integer;
begin
 select * into p from public.push_preferences where user_id=p_user and enabled;
 if not found then return result; end if;
 local_day=extract(dow from p_now at time zone p.timezone)::integer;
 select max(e.created_at) into last_record from public.entries e join public.user_books ub on ub.id=e.user_book_id where ub.user_id=p_user;
 if 'reminder'=any(p.kinds) and coalesce(last_record,p.consent_at)<=p_now-interval '3 days'
 and exists(select 1 from public.user_books where user_id=p_user and not is_finished)
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"reminder"}]')
 and (select count(*) from public.push_deliveries where user_id=p_user and created_at>greatest(coalesce(last_record,p.consent_at),p.seen_at) and items @> '[{"kind":"reminder"}]')<2 then
 result=result||jsonb_build_array(jsonb_build_object('kind','reminder','href','/books','label','읽고 있는 책에 한 문장 남겨볼까요?'));
 end if;
 if 'finished'=any(p.kinds) then
 for b in select ub.id,ub.book_id from public.user_books ub where ub.user_id=p_user and ub.is_finished and ub.finished_at>=p.consent_at and ub.finished_at<=p_now-interval '7 days'
 and not exists(select 1 from public.entries e where e.user_book_id=ub.id and e.created_at>=ub.finished_at and nullif(btrim(e.note),'') is not null)
 and not exists(select 1 from public.push_finished_receipts r where r.user_id=p_user and r.user_book_id=ub.id)
 order by ub.finished_at limit 5 loop
 result=result||jsonb_build_array(jsonb_build_object('kind','finished','book',b.id,'href','/books/'||b.book_id||'/entry/new','label','완독한 책의 여운을 남겨보세요'));
 end loop;
 end if;
 if 'weekly'=any(p.kinds) and local_day=0 and last_record>p_now-interval '7 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='weekly' and seen_at>p_now-interval '1 day')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"weekly"}]') then
 result=result||jsonb_build_array(jsonb_build_object('kind','weekly','href','/notifications/weekly','label','이번 주에 남긴 기록을 돌아보세요'));
 end if;
 if 'recall'=any(p.kinds) and p.consent_at<=p_now-interval '14 days'
 and not exists(select 1 from public.push_seen where user_id=p_user and kind='recall' and seen_at>p_now-interval '14 days')
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '14 days' and items @> '[{"kind":"recall"}]') then
 select ent.id into recalled from public.entries ent join public.user_books ub on ub.id=ent.user_book_id
 where ub.user_id=p_user and ent.date<=(p_now at time zone p.timezone)::date-30 and nullif(btrim(ent.quote),'') is not null
 and not exists(select 1 from public.push_deliveries d where d.user_id=p_user and d.items @> jsonb_build_array(jsonb_build_object('entry',ent.id)))
 order by ent.date,ent.created_at,ent.id limit 1;
 if found then result=result||jsonb_build_array(jsonb_build_object('kind','recall','entry',recalled.id,'href','/entry/'||recalled.id,'label','예전에 남긴 문장을 다시 만나보세요')); end if;
 end if;
 if 'friends'=any(p.kinds) and local_day=3
 and not exists(select 1 from public.push_deliveries where user_id=p_user and created_at>p_now-interval '7 days' and items @> '[{"kind":"friends"}]') then
 select greatest(p.consent_at,p_now-interval '7 days',coalesce((select seen_at from public.push_seen where user_id=p_user and kind='friends'),p.consent_at)) into cutoff;
 if exists(select 1 from public.entries ent join public.user_books ub on ub.id=ent.user_book_id where not ent.is_private and ent.created_at>cutoff
 and exists(select 1 from public.friends f where f.status='accepted' and ((f.user_id=p_user and f.friend_id=ub.user_id) or (f.friend_id=p_user and f.user_id=ub.user_id)))) then
 result=result||jsonb_build_array(jsonb_build_object('kind','friends','href','/social','label','친구들이 새 기록을 남겼어요'));
 end if;
 end if;
 return result;
end $$;
```

- [ ] **Step 6: 옮겨 적기 대조**

Run:

```bash
diff <(sed -n 100,145p supabase/migrations/20260907120231_web_push_reminders.sql | sed 's#/protected/#/#g; s/^create function/create or replace function/') \
     <(sed -n 3,48p supabase/migrations/20261021090000_push_hrefs_without_protected.sql)
```

Expected: 출력 없음(다른 곳은 하나도 바뀌지 않았다). 실행 전 마이그레이션 파일의 행 번호가 3~48인지 확인하고, 다르면 범위를 맞춘다.

- [ ] **Step 7: 커밋**

```bash
git add worker/index.js lib/push supabase/migrations/20261021090000_push_hrefs_without_protected.sql
git commit -m "feat: 독서 알림을 누르면 새 주소의 화면이 열린다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

마이그레이션의 **프로덕션 적용은 PR 머지 뒤 사용자 승인을 받아** 한다(Supabase MCP `apply_migration`). 적용 전까지도 옛 주소는 308로 이어지므로 알림은 깨지지 않는다.

---

### Task 5: 문서와 실제 동작 확인, PR

**Files:**
- Modify: `AGENTS.md:19-23`, `README.md`, `docs/notifications/web-push.md`, `docs/operations/library-search.md`

- [ ] **Step 1: 현재 경로 설명 고치기**

`AGENTS.md` "실제 제품의 주요 공간" 표의 코드 입구: `app/protected/dashboard/` → `app/(app)/today/`, `app/protected/books/` → `app/(app)/books/`, `app/protected/social/` → `app/(app)/social/`, `app/protected/profile/` → `app/(app)/profile/`, `app/protected/notifications/` → `app/(app)/notifications/`. 표 열 맞춤은 `npx prettier --write AGENTS.md`.

나머지 세 문서는 `grep -n protected <파일>`로 찾아 같은 규칙(폴더는 `app/(app)/…`, 주소는 `/…`, 대시보드는 `today`)으로 고친다.

- [ ] **Step 2: 로컬 서버로 실제 동작 확인**

`docs/operations/preview-server.md` 절차로 이 worktree의 dev 서버를 띄운 뒤(포트·PID 기록):

```bash
curl -sI http://127.0.0.1:<port>/protected/social?invite=x | grep -iE '^(HTTP|location)'
curl -sI http://127.0.0.1:<port>/protected/dashboard | grep -iE '^(HTTP|location)'
curl -sI http://127.0.0.1:<port>/protected | grep -iE '^(HTTP|location)'
curl -sI http://127.0.0.1:<port>/books?sort=recent | grep -iE '^(HTTP|location)'
curl -sI http://127.0.0.1:<port>/bookstore | grep -iE '^HTTP'
```

Expected:
- `308` + `location: /social?invite=x`
- `308` + `location: /today`
- `308` + `location: /today`
- `307` + `location: …/login?redirect=%2Fbooks%3Fsort%3Drecent`
- `404`(로그인으로 보내지 않음)

브라우저(Playwright, 모바일 390)로 테스트 계정 로그인 → `/today`, `/books`, 책 하나, 기록 하나, `/social`, `/profile`, `/search`, `/notifications/inbox`를 차례로 열어 화면이 그대로인지, 탭 바 강조가 맞는지, 콘솔 오류가 없는지 본다. 로그인 화면에서 `?redirect=/protected/social` 으로 로그인해 `/social`에 닿는지 본다. 계정 정보는 파일·로그·PR에 남기지 않는다.

- [ ] **Step 3: 최종 검사**

Run: `npm test && npm run lint && npm run build`
Expected: 모두 통과

Run: `grep -rn "/protected" app components lib hooks worker proxy.ts next.config.ts --include='*.ts' --include='*.tsx' --include='*.js'`
Expected: `lib/routes.ts`의 이동 규칙, `lib/__tests__/routes.test.ts`·`proxy.test.ts`의 옛 주소 테스트, `app/auth/callback/page.tsx`의 과거 주석만 남는다.

- [ ] **Step 4: 커밋·푸시·Draft PR**

```bash
git add AGENTS.md README.md docs/notifications/web-push.md docs/operations/library-search.md
git commit -m "docs: 앱 화면의 새 폴더와 주소를 안내한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin chore/route-cleanup
gh pr create --draft --base main --title "chore: 앱 주소에서 /protected가 빠지고 오늘 화면은 /today가 된다"
```

PR 본문(저장소 형식: 무엇이 달라지나요 / 어떻게 바꾸었나요 / 확인한 내용)에 적을 것: 옛 주소 영구 이동, 로그인 검사 방식, 알림 주소, DB 함수 마이그레이션(머지 후 사용자 승인 하에 프로덕션 적용 — 미적용), Supabase 대시보드 이메일 템플릿·리다이렉트 허용 목록 확인(사람 작업), 실기기·설치형 PWA 미검증 여부. 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 5: Notion 이슈 갱신**

이슈 "주소에서 /protected 빼기"를 In Review로, PR 링크 기록.
