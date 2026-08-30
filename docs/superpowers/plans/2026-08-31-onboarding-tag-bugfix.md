# 온보딩 태그 오분류 버그 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 온보딩 프로필 등록 시 `profiles_pkey` 충돌(이미 프로필 존재)을 태그 충돌로 오분류해 "중복 태그가 너무 많습니다"를 띄우는 버그를 고치고, 재제출을 유발하는 라우팅 구멍(proxy matcher에 `/onboarding` 누락)을 막는다.

**Architecture:** insert 에러를 Postgres 에러 코드(`23505`)와 제약명(`profiles_pkey` / `profiles_nickname_tag_key`)으로 분류하는 순수 함수를 만들고, route가 이를 구조화된 409 응답(`code: 'profile_exists' | 'tag_conflict'`)으로 변환한다. 클라이언트는 문자열 매칭 대신 `code`로 분기한다(재시도는 `tag_conflict`에만). proxy matcher에 `/onboarding`을 추가해 비로그인/프로필 보유 사용자를 올바로 리다이렉트한다. 사전 존재 검사 없이 unique 제약 + 에러 분류만으로 원자적으로 처리한다(레이스 없음).

**Tech Stack:** Next.js 16 App Router, Supabase JS(@supabase/ssr), vitest.

**Spec:** 공식 스펙 없음 — Notion 이슈 "온보딩 태그 오분류 버그"(P1·Bug, id `3cceedee-de86-8164-a51b-d6896676c400`)가 요구사항. 확정된 원인(프로덕션 로그): 첫 제출 201 성공 후 재제출 20건 전부 `duplicate key value violates unique constraint "profiles_pkey"` — `profiles_nickname_tag_key` 위반은 0건. route가 모든 insert 에러를 500 + 원문 메시지로 평탄화하고, 클라이언트가 `res.status === 500 && result.error?.includes('duplicate key')`로 태그 충돌이라 오판해 5회 재시도 후 "중복 태그가 너무 많습니다"를 띄움. 재제출 경로는 proxy matcher의 `/onboarding` 누락(프로필 보유 사용자가 온보딩 페이지에 다시 접근 가능). *(최종 리뷰 정정: base 시점에도 `app/onboarding/page.tsx`가 프로필 보유자를 서버에서 리다이렉트하고 있어 matcher 누락만으론 20건을 설명하지 못한다. 실제 재진입 경로는 proxy로 막을 수 없는 bfcache 뒤로가기·next-pwa 서비스워커 캐시(NetworkFirst)로 추정 — 따라서 근본 수정은 API의 에러 분류이고, proxy 변경은 방어 심화(defense-in-depth)다.)*

## Global Constraints

- 프로덕션 Supabase에 로그인·계정 생성·데이터 삽입 금지(검증은 vitest·tsc·build로만).
- DB 스키마 변경 없음 — unique 제약 `profiles_pkey(id)`, `profiles_nickname_tag_key(nickname, tag)`는 그대로 사용.
- 500 응답에 DB 원문 에러 메시지를 노출하지 않는다(서버 `console.error`로만 기록). 재시도 판정을 에러 메시지 문자열에 의존하는 코드를 남기지 않는다.
- 색상에 `dark:` 프리픽스 금지(토큰이 자동 전환) 등 기존 UI 규칙 유지 — 이번 플랜은 UI 변경 없음.
- 커밋 메시지는 기존 관례(gitmoji + `fix(onboarding): …` 한국어 요약).

---

### Task 1: insert 에러 분류 순수 함수 + 테스트

**Files:**
- Create: `lib/onboarding/classifyProfileInsertError.ts`
- Test: `lib/onboarding/classifyProfileInsertError.test.ts`

**Interfaces:**
- Consumes: 없음 (독립 순수 함수)
- Produces: `classifyProfileInsertError(error: { code?: string; message?: string } | null | undefined): 'profile_exists' | 'tag_conflict' | 'unknown'` — Task 2의 route가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// lib/onboarding/classifyProfileInsertError.test.ts
import { describe, expect, it } from 'vitest';
import { classifyProfileInsertError } from './classifyProfileInsertError';

describe('classifyProfileInsertError', () => {
  it('pkey 유니크 위반은 profile_exists', () => {
    expect(
      classifyProfileInsertError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_pkey"',
      })
    ).toBe('profile_exists');
  });

  it('nickname_tag 유니크 위반은 tag_conflict', () => {
    expect(
      classifyProfileInsertError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_nickname_tag_key"',
      })
    ).toBe('tag_conflict');
  });

  it('알 수 없는 제약의 23505는 unknown', () => {
    expect(
      classifyProfileInsertError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "other_key"',
      })
    ).toBe('unknown');
  });

  it('23505가 아닌 에러는 메시지에 duplicate key가 있어도 unknown', () => {
    expect(
      classifyProfileInsertError({ code: '42501', message: 'duplicate key mention' })
    ).toBe('unknown');
  });

  it('null/undefined/빈 객체는 unknown', () => {
    expect(classifyProfileInsertError(null)).toBe('unknown');
    expect(classifyProfileInsertError(undefined)).toBe('unknown');
    expect(classifyProfileInsertError({})).toBe('unknown');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run lib/onboarding/classifyProfileInsertError.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

```typescript
// lib/onboarding/classifyProfileInsertError.ts

/** 온보딩 프로필 insert 실패를 사용자 행동으로 이어지는 세 갈래로 분류한다. */
export type ProfileInsertErrorKind = 'profile_exists' | 'tag_conflict' | 'unknown';

export function classifyProfileInsertError(
  error: { code?: string; message?: string } | null | undefined
): ProfileInsertErrorKind {
  if (error?.code !== '23505') return 'unknown';
  const message = error.message ?? '';
  if (message.includes('profiles_pkey')) return 'profile_exists';
  if (message.includes('profiles_nickname_tag_key')) return 'tag_conflict';
  return 'unknown';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/onboarding/classifyProfileInsertError.test.ts`
Expected: PASS 5/5

- [ ] **Step 5: 커밋**

```bash
git add lib/onboarding/classifyProfileInsertError.ts lib/onboarding/classifyProfileInsertError.test.ts
git commit -m "✨ feat(onboarding): 프로필 insert 에러를 제약명 기반으로 분류하는 순수 함수"
```

### Task 2: route 구조화 응답 + 클라이언트 재시도 판정 수정

**Files:**
- Modify: `app/api/onboarding/route.ts:30-46`
- Modify: `app/onboarding/_components/OnboardingForm.tsx:42-62`

**Interfaces:**
- Consumes: Task 1의 `classifyProfileInsertError`.
- Produces: API 응답 계약 —
  - 성공: 200 `{ success: true }`
  - 프로필 이미 존재: 409 `{ code: 'profile_exists', error: '이미 프로필이 존재합니다.' }`
  - 닉네임+태그 충돌: 409 `{ code: 'tag_conflict', error: '같은 닉네임과 태그 조합이 이미 있습니다.' }`
  - 그 외 insert 실패: 500 `{ error: '프로필 등록에 실패했습니다.' }` (DB 원문 메시지 비노출, 서버 console.error로 기록)
  - 기존 400(필드 누락·JSON 오류)/401 유지.

- [ ] **Step 1: route의 insert 에러 처리 교체**

`app/api/onboarding/route.ts`의 42-45행(`if (!data || insertError) { ... }`)을 다음으로 교체하고, 파일 상단에 import를 추가한다:

```typescript
import { classifyProfileInsertError } from '@/lib/onboarding/classifyProfileInsertError';
```

```typescript
    if (insertError || !data) {
      const kind = classifyProfileInsertError(insertError);
      if (kind === 'profile_exists') {
        return NextResponse.json(
          { code: 'profile_exists', error: '이미 프로필이 존재합니다.' },
          { status: 409 }
        );
      }
      if (kind === 'tag_conflict') {
        return NextResponse.json(
          { code: 'tag_conflict', error: '같은 닉네임과 태그 조합이 이미 있습니다.' },
          { status: 409 }
        );
      }
      console.error('[ONBOARDING INSERT ERROR]', insertError);
      return NextResponse.json({ error: '프로필 등록에 실패했습니다.' }, { status: 500 });
    }
```

(기존 코드의 `insertError.message` 접근은 `insertError`가 null이고 `data`만 null일 때 TypeError였다 — 이 교체로 함께 해소된다.)

- [ ] **Step 2: 클라이언트 분기 교체**

`app/onboarding/_components/OnboardingForm.tsx`의 47-60행(응답 분기)을 다음으로 교체한다:

```typescript
        const result = await res.json().catch(() => ({}));

        if (res.status === 409 && result.code === 'tag_conflict') {
          tag = generateRandomTag();
          tries++;
        } else if (res.status === 409 && result.code === 'profile_exists') {
          toast.error(result.error || '이미 프로필이 존재합니다.');
          router.push('/protected/dashboard');
          return;
        } else {
          toast.error(result.error || '프로필 등록 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }
```

62행의 소진 문구는 `'태그 생성이 계속 겹칩니다. 닉네임을 바꿔 다시 시도해주세요.'`로 교체한다(태그 충돌에만 도달 가능해졌으므로 정확한 안내).

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit && npx vitest run && npx eslint app/api/onboarding/route.ts app/onboarding/_components/OnboardingForm.tsx lib/onboarding/`
Expected: 전부 통과. (route/클라이언트는 Supabase·fetch 결합이라 단위 테스트 없음 — 분류 로직은 Task 1 테스트가 커버.)

- [ ] **Step 4: 커밋**

```bash
git add app/api/onboarding/route.ts app/onboarding/_components/OnboardingForm.tsx
git commit -m "🐛 fix(onboarding): pkey 충돌을 태그 충돌로 오분류해 무한 재시도하던 버그 수정"
```

### Task 3: proxy에 /onboarding 보호 추가

**Files:**
- Modify: `proxy.ts:42-54, 56-68, 97-99`

**Interfaces:**
- Consumes: 없음.
- Produces: 라우팅 규칙 — `/onboarding`은 비로그인 시 `/login`으로, 프로필 보유 시 `/protected/dashboard`로 리다이렉트. 비로그인 시 profiles 조회를 생략(`id=eq.undefined` 요청 제거).

- [ ] **Step 1: matcher에 /onboarding 추가**

```typescript
export const config = {
  matcher: ['/', '/login', '/signup', '/onboarding', '/protected/:path*'],
};
```

- [ ] **Step 2: 프로필 조회를 user 존재 시로 한정**

43-47행의 무조건 조회를 다음으로 교체한다:

```typescript
  // Fetch user profile from 'profiles' table (only when logged in)
  let profile: { id: string } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    profile = data;
  }
```

- [ ] **Step 3: /onboarding 접근 규칙 추가**

기존 56-68행의 비로그인 리다이렉트 조건에 `/onboarding`을 포함한다(`redirect` 파라미터는 붙이지 않는다 — proxy가 로그인 후 프로필 유무로 목적지를 다시 정한다):

```typescript
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    (request.nextUrl.pathname.startsWith('/protected') ||
      request.nextUrl.pathname.startsWith('/onboarding'))
  ) {
```

(단, `/onboarding`일 때는 `url.searchParams.set('redirect', ...)`를 건너뛴다 — 아래처럼 조건 처리:)

```typescript
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (request.nextUrl.pathname.startsWith('/protected')) {
      url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(url);
```

그리고 70-79행의 로그인 사용자 리다이렉트 블록 뒤에 프로필 보유 사용자의 온보딩 재진입 차단을 추가한다:

```typescript
  if (user && profile && request.nextUrl.pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone();
    url.pathname = '/protected/dashboard';
    return NextResponse.redirect(url);
  }
```

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit && npx eslint proxy.ts && npm run build`
Expected: 전부 통과, build 정상.

- [ ] **Step 5: 커밋**

```bash
git add proxy.ts
git commit -m "🐛 fix(onboarding): proxy matcher에 /onboarding 추가 — 프로필 보유·비로그인 접근 차단"
```

---

## 최종 리뷰 반영 (수정 라운드)

opus 전체 리뷰(Ready: With fixes, Critical 0) 반영. 컨트롤러 룰링:

1. **제약명 비의존 분류(Important 1 → (b)안)**: `profiles_nickname_tag_key`라는 이름은 저장소·프로덕션 로그 어디서도 검증되지 않았고, DB 메타데이터 조회는 세션 권한 분류기에 차단됨. 분류를 "23505 + `profiles_pkey`(로그로 검증된 유일한 이름) → `profile_exists`, 그 외 23505 → `tag_conflict`, 비-23505 → `unknown`"으로 변경해 미검증 이름 의존을 제거. 테스트의 '알 수 없는 제약의 23505' 케이스는 `tag_conflict` 기대로 변경. 비용: 미래에 제3의 유니크 제약이 생기면 재시도(상한 5회) 후 태그 문구가 부정확할 수 있음 — 현존 제약 2개 하에선 정확.
2. **401 처리(Important 2)**: 클라이언트에 401 전용 분기(세션 만료 한국어 토스트 + `/login` push). route의 필드 누락 400 메시지도 한국어로.
3. **matcher 패턴 정합(Minor 4)**: `'/onboarding'` → `'/onboarding/:path*'`.
4. **비로그인 목적지 통일(Minor 5)**: `app/onboarding/page.tsx`의 `redirect('/')` → `redirect('/login')`.
5. **로그 보강(Minor 6)**: insert 실패 로그에 `{ insertError, hasData }`.
6. **profile_exists 토스트(Minor 9)**: `toast.error` → `toast.info`.
7. **이연**: route 계약 테스트(Minor 7)는 후속 이슈로. Issue 3(재제출 경로 진단 정정)은 Spec 문단에 정정 주석으로 반영.
