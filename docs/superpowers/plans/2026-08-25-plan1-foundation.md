# Plan ① 기반: DB 마이그레이션·타입·배지 제거·테스트 인프라

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문장 중심 리디자인의 데이터 기반을 만든다 — entries를 quote/note 구조로 전환하고, 배지 시스템 코드를 제거하고, notifications 테이블과 테스트 인프라를 준비한다.

**Architecture:** DB는 Supabase 원격 PostgreSQL 하나뿐이다(로컬 스택 없음). 마이그레이션 SQL을 레포(`supabase/migrations/`)에 기록하고 Supabase MCP의 `apply_migration`으로 적용한다. 컬럼 rename(summary→note)은 코드 반영과 같은 세션에서 처리하고 즉시 배포한다(트래픽 사실상 0이라 짧은 불일치 허용 — 사용자 승인됨).

**Tech Stack:** Next.js 16(App Router, `--webpack`), TypeScript 5(strict), Supabase(@supabase/ssr), Tailwind 3.4, vitest(신규, devDependency).

**Spec:** `docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md`

## Global Constraints

- 커밋 메시지는 gitmoji + 한국어 (예: `♻️ refactor(entries): ...`), 말미에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 빌드 확인은 `npm run build` (webpack 플래그 내장), 타입 확인은 `npx tsc --noEmit`
- 새 dependency 금지(예외: 이 플랜의 `vitest` devDependency)
- 날짜 판정 기준은 KST(`Asia/Seoul`), `date-fns-tz` 사용(이미 설치됨)
- UI 카피는 한국어
- DB에서 `entries.from_page`/`to_page`/`summary`, `books.total_pages`는 **이미 nullable**이다(types/supabase.d.ts 확인 완료). 필수 강제는 앱 코드에만 있다.

---

### Task 1: 마이그레이션 SQL 작성

**Files:**
- Create: `supabase/migrations/20260825000000_sentence_centric_foundation.sql`

**Interfaces:**
- Produces: DB 스키마 — `entries.note`(구 summary), `entries.quote`, CHECK 제약, `notifications` 테이블, `update_user_book_progress` 재정의. Task 2가 적용, Task 3의 타입이 이 스키마를 그대로 미러링.

- [ ] **Step 1: SQL 파일 작성**

```sql
-- 문장 중심 리디자인 기반 마이그레이션
-- 스펙: docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md §3

-- 1) entries: summary → note, quote 추가, 내용 필수 제약
alter table public.entries rename column summary to note;
alter table public.entries add column if not exists quote text;
alter table public.entries
  add constraint entries_content_check check (quote is not null or note is not null);

-- 2) 진행률 RPC 재정의: 페이지 없는 기록은 무시, total_pages 없으면 progress null
create or replace function public.update_user_book_progress(p_book_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_book_id uuid;
  v_total_pages int;
  v_last_page int;
begin
  select ub.id, b.total_pages
    into v_user_book_id, v_total_pages
  from public.user_books ub
  join public.books b on b.id = ub.book_id
  where ub.book_id = p_book_id and ub.user_id = p_user_id;

  if v_user_book_id is null then
    return;
  end if;

  select max(e.to_page)
    into v_last_page
  from public.entries e
  where e.user_book_id = v_user_book_id and e.to_page is not null;

  update public.user_books
  set last_read_page = v_last_page,
      progress = case
        when v_last_page is null or v_total_pages is null or v_total_pages = 0 then null
        else least(100, round(v_last_page::numeric * 100 / v_total_pages))::int
      end
  where id = v_user_book_id;
end
$$;

-- 3) notifications 테이블 + RLS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('friend_request', 'friend_accept', 'like', 'comment')),
  entry_id uuid references public.entries(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);
create policy "notifications_insert_as_actor" on public.notifications
  for insert with check (auth.uid() = actor_id);

-- 주의: badges / user_badges 테이블은 이 마이그레이션에서 drop하지 않는다.
-- 코드 제거(Task 4) 배포가 안정화된 뒤 별도 마이그레이션으로 drop한다(스펙 §3.6).
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/20260825000000_sentence_centric_foundation.sql
git commit -m "🗃️ feat(db): 문장 중심 기반 마이그레이션 SQL 추가"
```

---

### Task 2: 마이그레이션 적용과 검증 (사용자 확인 게이트)

**Files:** 없음 (원격 DB 조작만)

**Interfaces:**
- Consumes: Task 1의 SQL 파일
- Produces: 적용된 원격 스키마. Task 3부터 코드가 `note`/`quote` 컬럼을 사용할 수 있음.

- [ ] **Step 1: Supabase MCP 도구 로드**

ToolSearch로 `+supabase apply_migration execute_sql list_tables`를 검색해 Supabase MCP(1068cb60 서버)의 `apply_migration`, `execute_sql`, `list_tables` 도구를 로드한다.

- [ ] **Step 2: 사전 검증 쿼리 실행**

`execute_sql`로 실행:

```sql
select
  (select count(*) from public.entries) as total,
  (select count(*) from public.entries where summary is null) as null_summary;
```

Expected: `null_summary = 0`. **0이 아니면 중단하고 사용자에게 보고한다** (CHECK 제약 위반 행 존재 — 처리 방침 필요).

- [ ] **Step 3: 사용자 확인 게이트**

사용자에게 보고하고 명시적 승인을 기다린다: "프로덕션 Supabase DB에 마이그레이션을 적용합니다. 적용 직후~코드 배포 전까지 기존 배포(summary 참조)는 기록 조회/작성이 잠시 깨집니다. 진행할까요?" — **승인 없이 진행 금지.**

- [ ] **Step 4: 적용**

`apply_migration`에 Task 1 SQL 전문을 `sentence_centric_foundation` 이름으로 전달.

- [ ] **Step 5: 사후 검증**

`execute_sql`로 실행, 모두 통과 확인:

```sql
-- note로 데이터가 보존되었는지 (rename이므로 값 이동 자체가 없어야 정상)
select count(*) as total,
       count(note) as with_note,
       count(quote) as with_quote
from public.entries;
-- 기대: with_note = 마이그레이션 전 total과 동일, with_quote = 0

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'entries'
order by column_name;
-- 기대: note, quote 존재, summary 없음

select count(*) from public.notifications;
-- 기대: 0 (테이블 존재 확인)
```

- [ ] **Step 6: `get_advisors` 실행(있으면)** — 새 테이블 RLS 경고 여부 확인, 발견 시 보고.

---

### Task 3: 코드 전면 반영 — summary→note, quote 타입·API

**Files:**
- Modify: `types/supabase.d.ts:139-179` (entries), 같은 파일 Tables에 notifications 추가
- Modify: `types/entry.ts` (3곳의 `summary` 필드)
- Modify: `app/api/entries/new/route.ts`
- Modify: `app/api/entries/[entry_id]/edit/route.ts`
- Modify(기계적 rename): `app/protected/entry/[entry_id]/edit/page.tsx`, `app/protected/entry/[entry_id]/edit/_components/EditEntryForm.tsx`, `app/protected/books/[book_id]/entry/new/_components/NewEntryForm.tsx`, `app/protected/dashboard/_components/SocialFeedItem.tsx`, `app/protected/dashboard/_components/WeeklyStreakSection.tsx`, `app/protected/dashboard/_components/TodaySummarySection.tsx`, `app/protected/social/_components/DetailSocialFeedItem.tsx`, `app/protected/social/feed/_components/DetailSocialFeedItem.tsx`, `components/EntryCard.tsx`, `components/entry/EntryDetailContent.tsx`, `components/books/BookDetailContent.tsx`, `lib/entries/fetchEntryDetail.ts`, `lib/queries/fetchSocialFeedEntries.ts`, `lib/books/fetchBookDetail.ts`, `lib/dashboard/fetchDashboardData.ts`, `lib/friends/fetchFriendBookEntries.ts`, `lib/friends/fetchFriendEntryDetail.ts`, `utils/entries.ts`

**Interfaces:**
- Consumes: Task 2가 적용한 스키마
- Produces:
  - `entries` Row 타입: `{ note: string | null; quote: string | null; from_page: number | null; to_page: number | null; date: string; is_private: boolean; user_book_id: string; id: string; created_at: string | null }`
  - `POST /api/entries/new` body: `{ user_book_id: string; date: string; quote?: string | null; note?: string | null; from_page?: number | null; to_page?: number | null; is_private?: boolean; book_id: string; user_id: string }` — quote/note 중 최소 하나 필수
  - `PATCH /api/entries/[entry_id]` body: `{ quote?: string | null; note?: string | null; from_page?: number | null; to_page?: number | null; is_private?: boolean }`

- [ ] **Step 1: 기계적 rename 실행**

```bash
grep -rlw --include='*.ts' --include='*.tsx' 'summary' app components lib utils types \
  | grep -v 'supabase.d.ts' \
  | xargs sed -i '' -e 's/[[:<:]]summary[[:>:]]/note/g' -e 's/setSummary/setNote/g' -e 's/initialSummary/initialNote/g'
```

(macOS BSD sed라 `\b` 대신 `[[:<:]]`/`[[:>:]]` 워드 경계를 쓴다.)

실행 후 `grep -rnw 'summary' app components lib utils types --include='*.ts*' | grep -v supabase.d.ts`가 빈 결과인지 확인.

- [ ] **Step 2: types/supabase.d.ts 수정**

entries의 Row/Insert/Update에서 `summary` → `note`로 바꾸고 `quote: string | null`(Insert/Update는 `quote?: string | null`)을 추가한다. Tables에 notifications를 추가한다:

```ts
notifications: {
  Row: {
    actor_id: string;
    created_at: string;
    entry_id: string | null;
    id: string;
    read_at: string | null;
    type: string;
    user_id: string;
  };
  Insert: {
    actor_id: string;
    created_at?: string;
    entry_id?: string | null;
    id?: string;
    read_at?: string | null;
    type: string;
    user_id: string;
  };
  Update: {
    actor_id?: string;
    created_at?: string;
    entry_id?: string | null;
    id?: string;
    read_at?: string | null;
    type?: string;
    user_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'notifications_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'notifications_actor_id_fkey';
      columns: ['actor_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'notifications_entry_id_fkey';
      columns: ['entry_id'];
      isOneToOne: false;
      referencedRelation: 'entries';
      referencedColumns: ['id'];
    },
  ];
};
```

`types/entry.ts`의 각 엔트리 타입에도 `quote: string | null;`을 추가한다(Step 1의 sed로 `summary`는 이미 `note`가 됨).

- [ ] **Step 3: 신규 API 검증 로직으로 교체**

`app/api/entries/new/route.ts`의 body 파싱·검증·insert 부분을 다음으로 교체:

```ts
const body = await req.json();
const { user_book_id, quote, note, from_page, to_page, date, is_private, book_id, user_id } = body;

const hasContent =
  (typeof quote === 'string' && quote.trim() !== '') ||
  (typeof note === 'string' && note.trim() !== '');

if (!user_book_id || !date || !hasContent) {
  return NextResponse.json(
    { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
    { status: 400 }
  );
}

if (from_page != null && to_page != null && Number(from_page) > Number(to_page)) {
  return NextResponse.json(
    { error: '시작 페이지는 종료 페이지보다 작거나 같아야 합니다.' },
    { status: 400 }
  );
}

const { error } = await supabase.from('entries').insert({
  user_book_id,
  quote: typeof quote === 'string' && quote.trim() !== '' ? quote.trim() : null,
  note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
  from_page: from_page ?? null,
  to_page: to_page ?? null,
  date,
  is_private: is_private ?? false,
});
```

`app/api/entries/[entry_id]/edit/route.ts`도 같은 원칙으로 교체(타입 주석 포함):

```ts
const {
  quote,
  note,
  from_page,
  to_page,
  is_private,
}: {
  quote?: string | null;
  note?: string | null;
  from_page?: number | null;
  to_page?: number | null;
  is_private?: boolean;
} = await req.json();

const hasContent =
  (typeof quote === 'string' && quote.trim() !== '') ||
  (typeof note === 'string' && note.trim() !== '');

if (!hasContent) {
  return NextResponse.json(
    { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
    { status: 400 }
  );
}

const { error } = await supabase
  .from('entries')
  .update({
    quote: typeof quote === 'string' && quote.trim() !== '' ? quote.trim() : null,
    note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
    from_page: from_page ?? null,
    to_page: to_page ?? null,
    is_private,
  })
  .eq('id', entry_id);
```

기존 폼(NewEntryForm/EditEntryForm)은 이 플랜에서는 rename만 반영된 상태로 둔다 — 페이지 필수 검증 완화와 새 UI는 Plan ③에서 폼을 통째로 교체하며 처리한다. 폼이 note와 페이지를 모두 보내므로 새 API와 호환된다.

- [ ] **Step 4: 타입·빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

Expected: 에러 0. `select` 문자열 안의 `note`(구 summary) 컬럼명이 DB와 일치하므로 런타임 동작 유지.

- [ ] **Step 5: 수동 스모크 테스트**

`npm run dev` → 로그인 → 아무 책에서 기록 1건 작성/수정/조회가 동작하는지 확인(대시보드·책 상세·소셜 피드에 내용 표시).

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "♻️ refactor(entries): summary→note 전환 및 quote 필드 도입"
```

---

### Task 4: 배지 시스템 코드 제거 + 완독 선언화

**Files:**
- Delete: `hooks/useBadgeAwarder.ts`, `utils/badges.ts`, `utils/badgeConditions.ts`, `lib/badges/condition.ts`, `components/profile/ProfileBadges.tsx`, `types/badges.ts`
- Modify: `app/protected/books/[book_id]/entry/new/_components/NewEntryForm.tsx` (import·`const awardBadges`·`await awardBadges(userId)` 제거)
- Modify: `components/books/MarkAsFinishedButton.tsx` (아래 코드로 교체)
- Modify: `lib/profile/fetchProfileData.ts` (user_badges 조회 2곳 제거, 반환 타입에서 `userBadges` 제거)
- Modify: `app/protected/profile/page.tsx`, `app/protected/social/u/[nicknameAndTag]/page.tsx` (`userBadges` 구조분해·전달 제거)
- Modify: `components/profile/ProfileStats.tsx` (badges prop과 배지 그리드 UI 전체 제거 — 독서요약 4카드는 유지)

**Interfaces:**
- Consumes: 없음 (독립 정리 작업)
- Produces: `MarkAsFinishedButton({ userBookId, onFinish }: { userBookId: string; onFinish: () => void })` — progress/userId prop 제거. `fetchProfileData`는 `{ profile, userBooks }`만 반환.

- [ ] **Step 1: 파일 삭제와 참조 제거**

위 Delete 목록 삭제 후 `grep -rn "Badge\|badge" app components lib utils hooks types --include='*.ts*'`로 남은 참조를 모두 제거한다(문자열 UI 카피 포함).

- [ ] **Step 2: MarkAsFinishedButton 교체**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

interface MarkAsFinishedButtonProps {
  userBookId: string;
  onFinish: () => void;
}

export default function MarkAsFinishedButton({ userBookId, onFinish }: MarkAsFinishedButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleMarkAsFinished = async () => {
    const { error } = await supabase
      .from('user_books')
      .update({ is_finished: true })
      .eq('id', userBookId);

    if (!error) {
      onFinish();
      router.refresh();
    } else {
      console.error('Failed to mark as finished:', error.message);
    }
  };

  return (
    <Button onClick={handleMarkAsFinished} size="sm" color="primary" className="mt-2">
      다 읽었어요
    </Button>
  );
}
```

호출부(`components/books/BookDetailContent.tsx`)에서 `progress`/`userId` prop 전달을 제거한다.

- [ ] **Step 3: 타입·빌드 확인**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 4: 수동 스모크 테스트**

dev 서버에서: 기록 작성 시 배지 토스트가 뜨지 않음 / 진행률과 무관하게 "다 읽었어요" 버튼 동작 / 프로필 페이지가 배지 그리드 없이 렌더.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "🔥 refactor(badges): 배지 시스템 제거 및 완독 사용자 선언화"
```

---

### Task 5: 테스트 인프라 + KST 날짜 유틸

**Files:**
- Create: `vitest.config.ts`, `lib/dates.ts`, `lib/__tests__/dates.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces: `toKSTDateString(d: Date): string`(`'yyyy-MM-dd'`), `todayKST(): string`. Plan ③(기록 date 기본값)·Plan ④(스트릭 KST 판정)가 이 함수를 사용한다.

- [ ] **Step 1: vitest 설치·설정**

```bash
npm install -D vitest
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
  },
});
```

`package.json` scripts에 `"test": "vitest run"` 추가.

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/__tests__/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toKSTDateString } from '@/lib/dates';

describe('toKSTDateString', () => {
  it('UTC 15:00 = KST 다음날 00:00 이후이므로 다음날로 판정한다', () => {
    expect(toKSTDateString(new Date('2026-08-24T15:00:00Z'))).toBe('2026-08-25');
  });

  it('UTC 14:59 = KST 23:59이므로 같은 날로 판정한다', () => {
    expect(toKSTDateString(new Date('2026-08-24T14:59:00Z'))).toBe('2026-08-24');
  });

  it('KST 자정 직후(UTC 전날 15:00:01)도 다음날로 판정한다', () => {
    expect(toKSTDateString(new Date('2026-12-31T15:00:01Z'))).toBe('2027-01-01');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/dates'`

- [ ] **Step 4: 구현**

`lib/dates.ts`:

```ts
import { formatInTimeZone } from 'date-fns-tz';

const KST = 'Asia/Seoul';

export function toKSTDateString(d: Date): string {
  return formatInTimeZone(d, KST, 'yyyy-MM-dd');
}

export function todayKST(): string {
  return toKSTDateString(new Date());
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 6: 커밋**

```bash
git add vitest.config.ts lib/dates.ts lib/__tests__/dates.test.ts package.json package-lock.json
git commit -m "✅ test: vitest 도입 및 KST 날짜 유틸 추가"
```

---

## 후속 플랜 연결

- Plan ② 디자인 토큰·컴포넌트 시스템 (스펙 §6)
- Plan ③ 기록 플로우 — 폼 교체·저장 후 확장·백필·책 등록 간소화 (스펙 §4, §3.3)
- Plan ④ 홈·회고 — 회상 카드·주간 리듬·스트릭 KST 적용 (스펙 §5)
- Plan ⑤ 소셜·공유, Plan ⑥ 알림, Plan ⑦ 랜딩·기술부채
- badges/user_badges 테이블 drop은 Plan ⑦에서 별도 마이그레이션으로.
