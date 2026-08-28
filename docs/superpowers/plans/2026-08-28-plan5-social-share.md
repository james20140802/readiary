# Plan ⑤ 소셜·공유 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 소셜 피드를 한 곳으로 일원화(데드 코드 제거)하고, 문장 카드 컴포넌트를 신설해 피드·이미지 공유·동적 OG가 같은 조판을 공유하게 하며, 프로필 공유 링크로 친구 초대를 가능하게 한다.

**Architecture:** 공개(비로그인) 접근은 좁은 SECURITY DEFINER RPC `get_public_entry` 하나로 한정한다(공개 기록 1건의 카드 필드만 반환; RLS·프라이버시 모델 불변). 새 공용 컴포넌트 `SentenceCard`가 피드 본문·공유 캡처·공유 페이지의 조판을 담당하고, OG 이미지는 next/og(satori)로 같은 조판을 재현한다(satori는 CSS 변수·woff2 미지원 → 라이트 팔레트 hex + 벤더링한 woff 사용). 친구 초대는 공개 라우트 `/invite/[nicknameAndTag]` → 로그인 게이트(redirect 파라미터 신설) → 소셜 탭 친구 신청 폼 프리필.

**Tech Stack:** Next.js App Router(Next 16), Supabase(@supabase/ssr), Tailwind(먹과 종이 토큰), next/og(ImageResponse), html-to-image, vitest.

**Spec:** `docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md` §7(소셜과 공유), §12(검증)

## Global Constraints

- 색상은 반드시 토큰 클래스(`bg-paper`, `text-ink`, `text-ink-sub`, `text-ink-faint`, `border-hairline`, `text-accent` 등)만 사용. **색상에 `dark:` 프리픽스 금지**(CSS 변수가 라이트/다크 자동 전환). 예외: next/og의 satori는 CSS 변수를 지원하지 않으므로 **opengraph-image 안에서만** 라이트 팔레트 hex(`#F7F3EC`, `#221E1A`, `#6E665C`, `#A39A8D`, `#E3DCD0`) 하드코딩 허용.
- 텍스트 스케일은 실존 토큰만: `text-quote`, `text-seal`, `text-body`, `text-body-sm`, `text-caption`, `text-overline`, `text-button`, `text-section-title`, `text-page-title`. (`text-ink-muted`는 존재하지 않음 — `text-ink-sub`/`text-ink-faint`를 쓸 것.)
- 아이콘은 lucide-react 단일. 신규 UI에 이모지 사용 금지.
- 검증 게이트: `npx tsc --noEmit` 클린 + `npx vitest run` 전체 통과 + `npm run build` exit 0. (`npm run lint`는 Next 16에서 기존에 깨져 있으므로 실행하지 않는다 — Plan ⑦ 대상.)
- 프로덕션 Supabase에 로그인·계정 생성·데이터 INSERT 금지. 마이그레이션 파일은 작성만 하고 **적용은 컨트롤러가 수행**한다.
- 새 quote/note 렌더링은 `whitespace-pre-wrap`으로 줄바꿈 보존.
- 커밋 메시지: gitmoji + 한국어 제목.
- 기존 프리미티브(`components/ui/*`) 시그니처 변경 금지.

## 참고: 이미 충족된 스펙 항목 (작업 불필요)

- **좋아요 `/api/likes` 통일**: `likes` 테이블을 만지는 곳은 `app/api/likes/route.ts` 하나뿐이고, 클라이언트 진입점은 `components/social/SocialActionBar.tsx`(fetch + optimistic update)로 이미 단일화되어 있다. 검증만 하고 손대지 않는다.
- **닉네임#태그 정확 검색**: `/api/friends/search` + `FriendRequestForm` 기존 동작 유지.

---

### Task 1: 소셜 데드 코드 제거

**Files:**
- Delete: `app/protected/social/feed/` 디렉터리 전체 (고아 라우트 — `page.tsx` + `_components/DetailSocialFeedItem.tsx` + `_components/DetailSocialFeedList.tsx`. 정상 사본 `app/protected/social/_components/`와 diff 0바이트 동일)
- Delete: `app/api/friends/list/route.ts` (미사용 — 페이지는 `lib/friends/fetchFriendList.ts`를 직접 호출)
- Modify: `lib/queries/fetchSocialFeedEntries.ts` — `fetchSocialFeedEntries`(6–95줄, non-detail 버전) 함수 제거, `fetchDetailSocialFeedEntries`(97줄~)만 유지. 제거로 미사용이 되는 import도 정리
- Modify: `utils/entries.ts` — `transformSocialFeedEntries`(4–33줄) 제거 (fetchSocialFeedEntries 전용이었음)
- Modify: `constants/social.ts` — `DASHBOARD_SOCIAL_FEED_PAGINATION_LIMIT` 제거, `FEED_PAGINATION_LIMIT`만 유지
- Modify: `types/entry.ts` — `SocialFeedEntry`, `RawEntry` 타입이 위 제거 후 참조 0건이면 함께 제거 (제거 전 `grep -rn "SocialFeedEntry\b" --include='*.ts*' .`, `grep -rn "RawEntry\b"`로 반드시 확인. `RawDetailEntry`는 detail 버전이 쓰므로 유지)

**Interfaces:**
- Consumes: 없음 (순수 삭제)
- Produces: 이후 태스크가 만지는 `app/protected/social/_components/DetailSocialFeedItem.tsx`가 유일한 피드 아이템 구현이 됨

- [ ] **Step 1: 각 대상의 참조 0건 확인**

각 삭제 대상에 대해 자기 정의부 외 참조가 없는지 grep으로 확인하고, 참조가 발견되면 삭제하지 말고 보고서에 남길 것:

```bash
grep -rn "social/feed" app lib components utils constants types --include='*.ts*'
grep -rn "fetchSocialFeedEntries\b" app lib components --include='*.ts*'
grep -rn "transformSocialFeedEntries" app lib components utils --include='*.ts*'
grep -rn "DASHBOARD_SOCIAL_FEED_PAGINATION_LIMIT" app lib components constants --include='*.ts*'
grep -rn "api/friends/list" app lib components --include='*.ts*'
```

- [ ] **Step 2: 삭제 수행**

```bash
rm -rf "app/protected/social/feed"
rm -rf app/api/friends/list
```

이후 `lib/queries/fetchSocialFeedEntries.ts`, `utils/entries.ts`, `constants/social.ts`, `types/entry.ts`를 위 명세대로 편집.

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과 (기존 테스트 28개 그대로)

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "🔥 refactor(social): 고아 피드 라우트·중복 컴포넌트·미사용 소셜 코드 제거"
```

---

### Task 2: SentenceCard 공용 컴포넌트 + 피드 적용

**Files:**
- Create: `components/entries/SentenceCard.tsx`
- Modify: `app/protected/social/_components/DetailSocialFeedItem.tsx` — 본문 영역(60–62줄 content join, 158–185줄 본문 블록)을 SentenceCard로 교체

**Interfaces:**
- Consumes: Tailwind 토큰(`font-serif`, `text-quote`, `text-body-sm`, `text-caption`, `text-seal`)
- Produces: `SentenceCard` — Task 4(공유 페이지)와 Task 5(이미지 캡처)가 재사용. props는 아래 정의가 정본:

```tsx
export interface SentenceCardProps {
  quote: string | null;
  note: string | null;
  bookTitle: string;
  bookAuthor?: string | null;
  dateLabel: string;          // 이미 포맷된 문자열 (예: "2026년 8월 28일")
  nickname?: string;          // 있으면 attribution 줄에 "@nickname" 추가
  collapsed?: boolean;        // true면 quote 4줄/note 3줄 line-clamp (피드용)
  showWordmark?: boolean;     // true면 우하단 "READIARY" 워드마크 (공유용)
  className?: string;
}
```

- [ ] **Step 1: SentenceCard 구현**

`components/entries/SentenceCard.tsx` (서버·클라이언트 양쪽에서 쓸 수 있게 hook 없이, `'use client'` 지시어 없이):

```tsx
export interface SentenceCardProps {
  quote: string | null;
  note: string | null;
  bookTitle: string;
  bookAuthor?: string | null;
  dateLabel: string;
  nickname?: string;
  collapsed?: boolean;
  showWordmark?: boolean;
  className?: string;
}

export default function SentenceCard({
  quote,
  note,
  bookTitle,
  bookAuthor,
  dateLabel,
  nickname,
  collapsed = false,
  showWordmark = false,
  className = '',
}: SentenceCardProps) {
  const attribution = [bookAuthor, dateLabel, nickname ? `@${nickname}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <figure className={className}>
      {quote && (
        <blockquote
          className={`font-serif text-quote text-ink whitespace-pre-wrap ${
            collapsed ? 'line-clamp-4' : ''
          }`}
        >
          “{quote}”
        </blockquote>
      )}
      {note && (
        <p
          className={`text-body-sm text-ink-sub whitespace-pre-wrap ${
            quote ? 'mt-3' : ''
          } ${collapsed ? 'line-clamp-3' : ''}`}
        >
          {note}
        </p>
      )}
      <figcaption className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-ink truncate">『{bookTitle}』</p>
          {attribution && (
            <p className="text-caption text-ink-faint truncate">{attribution}</p>
          )}
        </div>
        {showWordmark && (
          <span className="text-seal text-ink-faint shrink-0">READIARY</span>
        )}
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 2: DetailSocialFeedItem 본문 교체**

`app/protected/social/_components/DetailSocialFeedItem.tsx`에서:
1. `content` 계산(60–62줄)을 제거하고 더보기 판정용 길이만 계산:
   ```tsx
   const contentLength = (entry.quote?.length ?? 0) + (entry.note?.length ?? 0);
   ```
2. 본문 블록(`{/* 3. 독서 기록 본문 */}` 158–185줄)을 다음으로 교체 (더보기/접기 버튼 로직은 유지하되 판정을 `contentLength > 120`으로):
   ```tsx
   {contentLength > 0 && (
     <div className="px-4 pb-3">
       <SentenceCard
         quote={entry.quote}
         note={entry.note}
         bookTitle={book.title}
         bookAuthor={book.author}
         dateLabel={new Date(entry.date + 'T00:00:00').toLocaleDateString('ko-KR', {
           year: 'numeric',
           month: 'long',
           day: 'numeric',
         })}
         collapsed={!isExpanded}
       />
       {contentLength > 120 && !isExpanded && (
         <button
           onClick={() => setIsExpanded(true)}
           className="mt-2 text-caption font-bold text-accent hover:text-accent-hover transition-colors"
         >
           ...더 보기
         </button>
       )}
       {isExpanded && (
         <button
           onClick={() => setIsExpanded(false)}
           className="mt-2 text-caption font-medium text-ink-faint hover:text-ink-sub transition-colors"
         >
           접기
         </button>
       )}
     </div>
   )}
   ```
   import 추가: `import SentenceCard from '@/components/entries/SentenceCard';`
   상단 도서 정보 카드(책 표지/제목/저자, 130–156줄)는 그대로 유지 — SentenceCard의 attribution과 중복되지만 피드 헤더는 링크 역할이 있으므로 유지한다.

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과. `app/protected/social` 관련 빌드 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "✨ feat(entries): SentenceCard 공용 문장 카드 신설 + 소셜 피드 본문 적용"
```

---

### Task 3: 공개 기록 조회 RPC 마이그레이션 + fetchPublicEntry

**Files:**
- Create: `supabase/migrations/20260828000000_public_entry_share.sql`
- Create: `lib/share/fetchPublicEntry.ts`
- Create: `lib/share/validation.ts`
- Test: `lib/share/__tests__/validation.test.ts`

**Interfaces:**
- Consumes: `entries.user_book_id → user_books.id → books`, `user_books.user_id → profiles.id` (컬럼명은 `types/supabase.d.ts` 기준 검증됨)
- Produces:
  ```ts
  export type PublicShareEntry = {
    id: string;
    quote: string | null;
    note: string | null;
    date: string; // 'YYYY-MM-DD'
    bookTitle: string;
    bookAuthor: string | null;
    nickname: string;
  };
  export function fetchPublicEntry(entryId: string): Promise<PublicShareEntry | null>;
  export function isUuid(value: string): boolean; // lib/share/validation.ts
  ```
  Task 4가 페이지·OG 양쪽에서 `fetchPublicEntry`를 호출한다.

**설계 근거(변경 금지):** service role key가 환경에 없고, RLS를 anon에 넓게 여는 것은 프라이버시 모델 변경이다. 대신 SECURITY DEFINER 함수 하나가 "is_private=false인 기록 1건의 카드 필드"만 반환한다. entry id는 UUID(추측 불가)이므로 링크를 아는 사람만 열람 가능 — 스펙 §7·§12의 의도와 일치.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/share/__tests__/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isUuid } from '../validation';

describe('isUuid', () => {
  it('정상 UUID v4를 통과시킨다', () => {
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });
  it('대문자 UUID도 통과시킨다', () => {
    expect(isUuid('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
  });
  it('형식이 아니면 거부한다', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid('123e4567e89b42d3a456426614174000')).toBe(false);
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000'; drop table entries;--")).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/share`
Expected: FAIL — `Cannot find module '../validation'`

- [ ] **Step 3: 구현**

`lib/share/validation.ts`:

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
```

`supabase/migrations/20260828000000_public_entry_share.sql`:

```sql
-- Plan ⑤ 소셜·공유: 공개 기록 1건의 문장 카드 필드를 비로그인(anon)에게 노출하는
-- 유일한 통로. RLS 정책은 변경하지 않는다 — 이 함수가 공개 범위의 전부다.
create or replace function public.get_public_entry(p_entry_id uuid)
returns table (
  id uuid,
  quote text,
  note text,
  date date,
  book_title text,
  book_author text,
  nickname text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id,
    e.quote,
    e.note,
    e.date,
    b.title as book_title,
    b.author as book_author,
    p.nickname
  from entries e
  join user_books ub on ub.id = e.user_book_id
  join books b on b.id = ub.book_id
  join profiles p on p.id = ub.user_id
  where e.id = p_entry_id
    and e.is_private = false;
$$;

revoke all on function public.get_public_entry(uuid) from public;
grant execute on function public.get_public_entry(uuid) to anon, authenticated;
```

주의: `books.title`/`books.author`/`profiles.nickname`의 실제 컬럼명·null 여부를 `types/supabase.d.ts`에서 확인하고 다르면 맞출 것. **이 마이그레이션을 원격에 적용하지 말 것 — 파일 작성까지만. 적용은 컨트롤러가 한다.**

`lib/share/fetchPublicEntry.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { isUuid } from './validation';

export type PublicShareEntry = {
  id: string;
  quote: string | null;
  note: string | null;
  date: string;
  bookTitle: string;
  bookAuthor: string | null;
  nickname: string;
};

type PublicEntryRow = {
  id: string;
  quote: string | null;
  note: string | null;
  date: string;
  book_title: string;
  book_author: string | null;
  nickname: string;
};

/** 공개(비로그인) 문장 카드 데이터. 비공개·미존재 기록은 null. */
export async function fetchPublicEntry(entryId: string): Promise<PublicShareEntry | null> {
  if (!isUuid(entryId)) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase
    .rpc('get_public_entry', { p_entry_id: entryId })
    .maybeSingle<PublicEntryRow>();

  if (error) {
    console.error('fetchPublicEntry 실패:', error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    quote: data.quote,
    note: data.note,
    date: data.date,
    bookTitle: data.book_title,
    bookAuthor: data.book_author,
    nickname: data.nickname,
  };
}
```

참고: `get_public_entry`는 생성된 타입(`types/supabase.d.ts`)에 없으므로 rpc 이름에서 타입 에러가 나면 `supabase.rpc('get_public_entry' as never, ...)` 대신 클라이언트를 타입 파라미터 없이(`createClient`의 기본 제네릭) 생성해 우회한다 — 위 코드는 untyped client라 그대로 컴파일된다.

- [ ] **Step 4: 테스트·검증**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과 (신규 테스트 4개 포함)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "✨ feat(share): 공개 기록 조회 RPC 마이그레이션 + fetchPublicEntry"
```

---

### Task 4: 공개 공유 페이지 `/share/e/[entry_id]` + 동적 OG

**Files:**
- Create: `app/share/e/[entry_id]/page.tsx`
- Create: `app/share/e/[entry_id]/opengraph-image.tsx`
- Create: `app/fonts/MaruBuri-Regular.woff` (satori는 woff2 미지원 → 네이버 공식 CDN에서 woff 벤더링. OFL 고지는 기존 `app/fonts/LICENSE.md`가 커버)
- Create: `lib/share/format.ts` (날짜 라벨 헬퍼)

**Interfaces:**
- Consumes: `fetchPublicEntry(entryId)` (Task 3), `SentenceCard` (Task 2)
- Produces: 공개 URL 규칙 `/share/e/{entry_id}` — Task 5의 Web Share URL이 이 규칙을 사용

**주의:** 이 라우트는 `proxy.ts` matcher(`['/', '/login', '/signup', '/protected/:path*']`) 밖이므로 로그인 게이트를 타지 않는다(의도된 동작). 루트 레이아웃(Header/Navbar)이 그대로 적용된다 — 랜딩(`/`)과 같은 조건이므로 문제없음.

- [ ] **Step 1: 폰트 벤더링**

```bash
curl -fsSL -o app/fonts/MaruBuri-Regular.woff \
  "https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff"
ls -la app/fonts/MaruBuri-Regular.woff   # ~988KB 확인
```

- [ ] **Step 2: 날짜 라벨 헬퍼**

`lib/share/format.ts`:

```ts
/** 'YYYY-MM-DD' → '2026년 8월 28일'. 타임존 파싱 없이 문자열 분해(KST 안전). */
export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return `${y}년 ${m}월 ${d}일`;
}
```

(기존 `lib/dates.ts`에 동일 역할 헬퍼가 이미 있으면 그것을 쓰고 이 파일은 만들지 말 것 — 확인 후 결정.)

- [ ] **Step 3: 공유 페이지**

`app/share/e/[entry_id]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SentenceCard from '@/components/entries/SentenceCard';
import { fetchPublicEntry } from '@/lib/share/fetchPublicEntry';
import { formatDateLabel } from '@/lib/share/format';

type Props = { params: Promise<{ entry_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entry_id } = await params;
  const entry = await fetchPublicEntry(entry_id);
  if (!entry) return { title: 'Readiary' };
  return {
    title: `${entry.nickname}님의 문장 | Readiary`,
    description: (entry.quote ?? entry.note ?? '').slice(0, 120),
  };
}

export default async function ShareEntryPage({ params }: Props) {
  const { entry_id } = await params;
  const entry = await fetchPublicEntry(entry_id);
  if (!entry) notFound();

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <div className="bg-card border border-hairline rounded-2xl p-6">
        <SentenceCard
          quote={entry.quote}
          note={entry.note}
          bookTitle={entry.bookTitle}
          bookAuthor={entry.bookAuthor}
          dateLabel={formatDateLabel(entry.date)}
          nickname={entry.nickname}
          showWordmark
        />
      </div>
      <Link
        href="/"
        className="block text-center text-button text-accent hover:text-accent-hover transition-colors"
      >
        Readiary에서 나의 문장 기록하기
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: 동적 OG 이미지**

`app/share/e/[entry_id]/opengraph-image.tsx` — satori 제약: 자식이 여럿인 요소는 전부 `display:'flex'` 명시, CSS 변수·Tailwind 클래스 사용 불가, 라이트 팔레트 hex만:

```tsx
import { readFile } from 'fs/promises';
import { ImageResponse } from 'next/og';
import { fetchPublicEntry } from '@/lib/share/fetchPublicEntry';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Readiary 문장 카드';

export default async function OgImage({
  params,
}: {
  params: Promise<{ entry_id: string }>;
}) {
  const { entry_id } = await params;
  const entry = await fetchPublicEntry(entry_id);
  if (!entry) return new Response('Not Found', { status: 404 });

  const fontData = await readFile(
    new URL('../../../fonts/MaruBuri-Regular.woff', import.meta.url)
  );

  const raw = entry.quote ?? entry.note ?? '';
  const display = raw.length > 110 ? `${raw.slice(0, 110)}…` : raw;
  const attribution = [entry.bookAuthor, `@${entry.nickname}`].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F7F3EC',
          padding: '72px 80px',
          fontFamily: 'MaruBuri',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 40,
            lineHeight: 1.7,
            color: '#221E1A',
            wordBreak: 'keep-all',
          }}
        >
          {entry.quote ? `“${display}”` : display}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid #E3DCD0',
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', fontSize: 27, color: '#221E1A' }}>
              『{entry.bookTitle}』
            </div>
            {attribution && (
              <div style={{ display: 'flex', fontSize: 20, color: '#6E665C' }}>
                {attribution}
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 21,
              letterSpacing: '0.16em',
              color: '#A39A8D',
            }}
          >
            READIARY
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'MaruBuri', data: fontData, style: 'normal', weight: 400 }],
    }
  );
}
```

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과. 빌드 산출물에 `/share/e/[entry_id]` 라우트와 `opengraph-image` 표시.

(RPC가 아직 원격에 없으므로 런타임 QA는 컨트롤러가 마이그레이션 적용 후 수행 — 이 태스크는 빌드 검증까지.)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "✨ feat(share): 공개 문장 카드 페이지 /share/e/[id] + next/og 동적 OG 이미지"
```

---

### Task 5: 문장 카드 이미지 공유 (클라이언트, 4:5)

**Files:**
- Create: `components/entries/ShareEntryButton.tsx`
- Modify: `components/entry/EntryDetailContent.tsx` — 하단 액션 바에 공유 버튼 추가
- Modify: `package.json` — `html-to-image` 추가

**Interfaces:**
- Consumes: `SentenceCard`(Task 2), 공개 URL 규칙 `/share/e/{entry_id}`(Task 4), `formatDateLabel`(Task 4의 `lib/share/format.ts`)
- Produces: `<ShareEntryButton entryId quote note date isPrivate bookTitle bookAuthor />` (Step 2의 Props 정의가 정본) — `isPrivate`면 **아무것도 렌더하지 않는다**(스펙: 공유 UI 숨김)

- [ ] **Step 1: 의존성 설치**

```bash
npm install html-to-image
```

- [ ] **Step 2: ShareEntryButton 구현**

`components/entries/ShareEntryButton.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import type { CSSProperties } from 'react';
import SentenceCard from '@/components/entries/SentenceCard';
import { formatDateLabel } from '@/lib/share/format';

interface Props {
  entryId: string;
  quote: string | null;
  note: string | null;
  date: string;
  isPrivate: boolean;
  bookTitle: string;
  bookAuthor?: string | null;
}

/* 캡처 컨테이너는 뷰어의 다크모드와 무관하게 항상 라이트 팔레트로 찍는다.
   토큰 클래스가 CSS 변수를 읽으므로, 컨테이너에서 변수를 라이트 값으로 재정의. */
const LIGHT_PALETTE: CSSProperties = {
  '--paper': '247 243 236',
  '--card': '253 251 247',
  '--card-raised': '242 236 225',
  '--ink': '34 30 26',
  '--ink-sub': '110 102 92',
  '--ink-faint': '163 154 141',
  '--hairline': '227 220 208',
} as CSSProperties;

export default function ShareEntryButton({
  entryId,
  quote,
  note,
  date,
  isPrivate,
  bookTitle,
  bookAuthor,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  if (isPrivate) return null;

  const handleShare = async () => {
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'readiary-sentence.png', { type: 'image/png' });
      const shareUrl = `${window.location.origin}/share/e/${entryId}`;

      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Readiary 문장 카드',
          url: shareUrl,
        });
      } else {
        const anchor = document.createElement('a');
        anchor.href = dataUrl;
        anchor.download = 'readiary-sentence.png';
        anchor.click();
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
        toast.success('카드 이미지를 저장하고 공유 링크를 복사했습니다.');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('카드 공유 실패:', error);
        toast.error('카드 공유에 실패했습니다.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isSharing}
        className="flex items-center gap-1.5 text-caption font-medium text-ink-faint hover:text-ink-sub transition-colors disabled:opacity-50"
        title="문장 카드 공유"
      >
        <Share2 size={16} />
        공유
      </button>

      {/* 오프스크린 캡처 대상: 540×675(4:5) → pixelRatio 2 = 1080×1350 */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0 }} aria-hidden>
        <div
          ref={cardRef}
          style={{ width: 540, height: 675, ...LIGHT_PALETTE }}
          className="bg-paper flex flex-col justify-center p-12"
        >
          <SentenceCard
            quote={quote}
            note={note}
            bookTitle={bookTitle}
            bookAuthor={bookAuthor}
            dateLabel={formatDateLabel(date)}
            showWordmark
          />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: EntryDetailContent에 통합**

`components/entry/EntryDetailContent.tsx`의 하단 액션 통합 바에서 `<SocialActionBar ... />` 바로 뒤에 추가:

```tsx
<ShareEntryButton
  entryId={entry.id}
  quote={entry.quote}
  note={entry.note}
  date={entry.date}
  isPrivate={entry.is_private}
  bookTitle={book.title}
  bookAuthor={book.author}
/>
```

import 추가: `import ShareEntryButton from '@/components/entries/ShareEntryButton';`
(비공개 기록은 컴포넌트가 스스로 null을 반환하므로 호출부 분기 불필요.)

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "✨ feat(share): 문장 카드 4:5 이미지 캡처 + Web Share 공유 버튼"
```

---

### Task 6: 프로필 공유 링크 + 친구 초대 딥링크

**Files:**
- Create: `app/invite/[nicknameAndTag]/page.tsx`
- Create: `lib/social/invite.ts`
- Test: `lib/social/__tests__/invite.test.ts`
- Modify: `proxy.ts` — 로그인 리다이렉트에 `redirect` 파라미터 추가 (56–66줄 블록)
- Modify: `app/login/page.tsx` — 로그인 성공 시 `redirect` 파라미터로 복귀 (43줄)
- Modify: `components/profile/ProfileHeader.tsx` — 내 프로필에 초대 링크 공유 버튼
- Modify: `app/protected/social/page.tsx` + `app/protected/social/_components/SocialTab.tsx` + `app/protected/social/_components/FriendRequestForm.tsx` — `?invite=` 프리필

**Interfaces:**
- Consumes: 기존 닉네임-태그 슬러그 관례 — `app/protected/social/u/[nicknameAndTag]/page.tsx:22-24`와 동일하게 `decodeURIComponent` 후 **첫 번째 `-`에서 분할**
- Produces:
  ```ts
  // lib/social/invite.ts
  export function buildInviteSlug(nickname: string, tag: string | null): string;   // 'nickname-0000'
  export function parseInviteSlug(slug: string): { nickname: string; tag: string } | null;
  export function slugToSearchQuery(slug: string): string | null;                  // 'nickname#0000'
  ```

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/social/__tests__/invite.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildInviteSlug, parseInviteSlug, slugToSearchQuery } from '../invite';

describe('invite slug', () => {
  it('닉네임과 태그로 슬러그를 만든다', () => {
    expect(buildInviteSlug('책벌레', '1234')).toBe('책벌레-1234');
  });
  it('태그가 없으면 0000을 쓴다 (기존 ProfileHeader 관례)', () => {
    expect(buildInviteSlug('책벌레', null)).toBe('책벌레-0000');
  });
  it('첫 번째 하이픈에서 분할한다 (기존 u/[nicknameAndTag] 관례)', () => {
    expect(parseInviteSlug('책벌레-1234')).toEqual({ nickname: '책벌레', tag: '1234' });
  });
  it('URL 인코딩된 슬러그를 디코드한다', () => {
    expect(parseInviteSlug(encodeURIComponent('책벌레-1234'))).toEqual({
      nickname: '책벌레',
      tag: '1234',
    });
  });
  it('하이픈이 없으면 null', () => {
    expect(parseInviteSlug('책벌레')).toBeNull();
    expect(parseInviteSlug('')).toBeNull();
  });
  it('검색 쿼리 형식으로 변환한다', () => {
    expect(slugToSearchQuery('책벌레-1234')).toBe('책벌레#1234');
    expect(slugToSearchQuery('잘못된슬러그')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/social`
Expected: FAIL — `Cannot find module '../invite'`

- [ ] **Step 3: invite 유틸 구현**

`lib/social/invite.ts`:

```ts
export function buildInviteSlug(nickname: string, tag: string | null): string {
  return `${nickname}-${tag || '0000'}`;
}

/** 기존 u/[nicknameAndTag] 라우트와 동일: decode 후 첫 '-'에서 분할 */
export function parseInviteSlug(slug: string): { nickname: string; tag: string } | null {
  const decoded = decodeURIComponent(slug);
  const separatorIndex = decoded.indexOf('-');
  if (separatorIndex <= 0 || separatorIndex === decoded.length - 1) return null;
  return {
    nickname: decoded.slice(0, separatorIndex),
    tag: decoded.slice(separatorIndex + 1),
  };
}

export function slugToSearchQuery(slug: string): string | null {
  const parsed = parseInviteSlug(slug);
  return parsed ? `${parsed.nickname}#${parsed.tag}` : null;
}
```

Run: `npx vitest run lib/social` → PASS 확인.

- [ ] **Step 4: proxy·login에 redirect 복귀 추가**

`proxy.ts` 56–66줄의 로그인 리다이렉트 블록에서:

```ts
const url = request.nextUrl.clone();
url.pathname = '/login';
url.search = '';
url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
return NextResponse.redirect(url);
```

`app/login/page.tsx` 로그인 성공 분기(43줄)를:

```ts
const redirectParam = searchParams.get('redirect');
const redirectTo =
  redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : '/protected/dashboard';
router.push(redirectTo);
```

(오픈 리다이렉트 방지: `/`로 시작하고 `//`로 시작하지 않는 경로만 허용.)

- [ ] **Step 5: 초대 라우트**

`app/invite/[nicknameAndTag]/page.tsx` (proxy matcher 밖 공개 라우트 — 자체적으로 인증 확인):

```tsx
import { notFound, redirect } from 'next/navigation';
import { parseInviteSlug } from '@/lib/social/invite';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Props = { params: Promise<{ nicknameAndTag: string }> };

export default async function InvitePage({ params }: Props) {
  const { nicknameAndTag } = await params;
  if (!parseInviteSlug(nicknameAndTag)) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/invite/${nicknameAndTag}`)}`);
  }
  redirect(`/protected/social?invite=${encodeURIComponent(nicknameAndTag)}`);
}
```

주의: `lib/supabase/server.ts`의 실제 export 이름을 확인해서 쓸 것(다르면 그 이름으로).

- [ ] **Step 6: 소셜 탭 프리필**

1. `app/protected/social/page.tsx`: `searchParams`에서 `invite`를 읽어 `SocialTab`에 `initialInviteQuery={slugToSearchQuery(invite)}` 전달 (없거나 파싱 실패면 undefined).
2. `SocialTab.tsx`: prop `initialInviteQuery?: string` 추가 — 값이 있으면 초기 대분류 탭을 친구 관리로 설정하고 `FriendRequestForm`에 그대로 전달.
3. `FriendRequestForm.tsx`: prop `initialQuery?: string` 추가 — 마운트 시 값이 있으면 입력창에 채우고 검색을 1회 자동 실행(기존 검색 핸들러 재사용, `useEffect` + 실행 여부 ref 가드). 이후 흐름(결과 확인 모달 → 친구 신청)은 기존 그대로.

- [ ] **Step 7: ProfileHeader 공유 버튼**

`components/profile/ProfileHeader.tsx` — 내 프로필(`isOwnProfile`)의 버튼 그룹(수정 버튼 앞)에 추가:

```tsx
<button
  onClick={handleShareInvite}
  className="p-3 rounded-2xl hover:bg-card-raised transition-all text-ink-faint hover:text-ink active:scale-90"
  title="프로필 링크 공유"
>
  <Link2 size={22} strokeWidth={2.5} />
</button>
```

핸들러 (컴포넌트 상단에, `buildInviteSlug` import):

```tsx
const handleShareInvite = async () => {
  const inviteUrl = `${window.location.origin}/invite/${encodeURIComponent(
    buildInviteSlug(profile.nickname, profile.tag)
  )}`;
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Readiary에서 친구 맺기', url: inviteUrl });
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('초대 링크를 복사했습니다.');
    }
  } catch (error) {
    if ((error as DOMException)?.name !== 'AbortError') {
      console.error('초대 링크 공유 실패:', error);
    }
  }
};
```

lucide `Link2` import 추가, `sonner`의 `toast` import 추가.

- [ ] **Step 8: 검증**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과 (invite 테스트 6개 포함)

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "✨ feat(social): 프로필 초대 링크 + /invite 딥링크 + 로그인 redirect 복귀"
```

---

## 컨트롤러 후속 단계 (구현 태스크 아님)

1. Task 3 리뷰 통과 후: `supabase/migrations/20260828000000_public_entry_share.sql`을 Supabase MCP `apply_migration`으로 원격 적용. 적용 후 anon 키 REST 호출로 검증(로그인·INSERT 없음): 임의 UUID → 빈 결과, RPC 200.
2. 최종 리뷰 후 PR 생성, Notion 이슈 3건 In Progress + PR 링크: 문장 카드 이미지 공유+동적 OG(P1), 피드 일원화(P2), 프로필 링크 공유(P2).
3. 스펙 §12 공유 검증 항목(비공개 404 / 공개 렌더)은 Vercel 프리뷰에서 확인.
