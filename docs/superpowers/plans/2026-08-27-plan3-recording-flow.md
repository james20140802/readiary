# Plan ③ — 기록 플로우 (홈 입력창·저장 후 확장·백필·책 등록 간소화) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 최상단 입력창(composer)에서 문장 한 줄로 기록을 시작하고, 저장 직후 같은 행 UPDATE로 확장하며, 신규/수정 폼의 비대칭(날짜 고정·quote 부재)을 제거하고, 책 등록에서 페이지 수 강제를 없앤다.

**Architecture:** DB는 Plan ①에서 이미 준비됨(quote/note nullable 조합, CHECK 제약, `books.total_pages` nullable) — 이번 플랜은 API 완화 + UI 재작성만 한다. 기록 폼은 공용 `EntryForm` 컴포넌트 하나로 통합하고, 홈 composer는 대시보드 서버 컴포넌트가 내려주는 진행중 책 목록 위에 얹는 클라이언트 컴포넌트다. 저장 후 확장은 `POST /api/entries/new`가 생성된 행의 id를 반환하게 바꾼 뒤 기존 `PATCH /api/entries/[entry_id]/edit`를 재사용한다.

**Tech Stack:** Next.js 16 App Router(`--webpack`), Tailwind 3.4(먹과 종이 토큰), Supabase, vitest, lucide-react. 새 dependency 없음.

**Spec:** `docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md` (§4 기록 플로우, §3.3 books, §2-1·2-5 핵심 결정)

## Global Constraints

- 새 dependency 추가 금지 (기존 package.json 안에서만).
- 색상에 `dark:` 프리픽스 금지 — CSS 변수 토큰이 자동 전환한다 (`bg-paper`, `text-ink` 등만 사용).
- 그림자 금지(헤어라인 보더), 기울어진 도장 박스 금지, 구 원색 `#3B82F6` 금지.
- UI 카피는 한국어. 이모지 남용 금지 — 기존 폼의 📓/🌤️/📥/✅/🔒 등 장식 이모지는 제거한다.
- 아이콘은 lucide-react만 (size 20 기본, strokeWidth 1.75; 칩 내부는 size 12~14).
- 날짜 기본값·상한은 `lib/dates.ts`의 `todayKST()` 사용 — `new Date().toISOString().split('T')[0]` 새로 쓰지 않는다.
- UI는 `components/ui` 프리미티브(Button, Card, Input, Textarea, Chip, Seal, FormGroup, FormLabel, Modal) 우선 사용. 프리미티브 시그니처 변경 금지.
- DB 스키마 변경 금지 (Plan ①에서 완료됨).
- 검증·QA 과정에서 프로덕션 Supabase에 로그인·데이터 삽입 금지.

## 이연/제외 (이 플랜에서 하지 않음)

- 홈 화면 나머지 개편(회상 카드, 주간 리듬 재디자인, 피드 프리뷰 제거) → Plan ④.
- 스트릭 KST 버그(`fetchDashboardData`의 `new Date()` 스트릭 계산) → Plan ④ (별도 이슈).
- `InProgressBooksSection`의 진행률 0% 표시(페이지 없는 책) → Plan ④ 홈 개편에서 함께.
- 강조색 확정(잉크 vs 주홍)은 이 플랜의 결과 화면으로 사용자가 비교·결정한다 — 코드는 현행 `data-accent` 토글 유지.

---

### Task 1: 기록 검증 유틸 + API 정비

**Files:**
- Create: `lib/entries/validation.ts`
- Create: `lib/entries/__tests__/validation.test.ts`
- Modify: `app/api/entries/new/route.ts`
- Modify: `app/api/entries/[entry_id]/edit/route.ts`
- Modify: `app/api/books/new/route.ts`

**Interfaces:**
- Consumes: `lib/dates.ts`의 `todayKST(): string`.
- Produces:
  - `hasEntryContent(quote?: string | null, note?: string | null): boolean`
  - `isFutureKSTDate(date: string): boolean`
  - `POST /api/entries/new` 성공 응답이 `{ id: string }` (생성된 entry id) — Task 5의 저장 후 확장이 이 id로 PATCH한다.
  - `POST /api/books/new`가 `total_pages` 없이도(null) 등록 허용.

- [ ] **Step 1: 실패하는 테스트 작성** — `lib/entries/__tests__/validation.test.ts`

```ts
import { describe, expect, it, vi, afterEach } from 'vitest';
import { hasEntryContent, isFutureKSTDate } from '../validation';

describe('hasEntryContent', () => {
  it('둘 다 비어 있으면 false (공백만 있는 문자열 포함)', () => {
    expect(hasEntryContent(null, null)).toBe(false);
    expect(hasEntryContent(undefined, undefined)).toBe(false);
    expect(hasEntryContent('   ', '')).toBe(false);
  });

  it('한쪽에라도 실질 내용이 있으면 true', () => {
    expect(hasEntryContent('문장', null)).toBe(true);
    expect(hasEntryContent(null, '생각')).toBe(true);
    expect(hasEntryContent('문장', '생각')).toBe(true);
  });
});

describe('isFutureKSTDate', () => {
  afterEach(() => vi.useRealTimers());

  it('KST 기준 오늘·과거는 false, 미래는 true', () => {
    // 2026-08-26T16:00:00Z === 2026-08-27 01:00 KST → KST 오늘은 2026-08-27
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-26T16:00:00Z'));
    expect(isFutureKSTDate('2026-08-27')).toBe(false);
    expect(isFutureKSTDate('2026-08-26')).toBe(false);
    expect(isFutureKSTDate('2026-08-28')).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/entries/__tests__/validation.test.ts`
Expected: FAIL — `validation` 모듈 없음.

- [ ] **Step 3: 구현** — `lib/entries/validation.ts`

```ts
import { todayKST } from '@/lib/dates';

/** quote/note 중 하나라도 실질 내용이 있는지 — 공백만 있는 문자열은 내용 없음으로 본다 */
export function hasEntryContent(quote?: string | null, note?: string | null): boolean {
  return (
    (typeof quote === 'string' && quote.trim() !== '') ||
    (typeof note === 'string' && note.trim() !== '')
  );
}

/** KST 기준 미래 날짜인지 — 'yyyy-MM-dd' 문자열은 사전순 비교로 충분하다 */
export function isFutureKSTDate(date: string): boolean {
  return date > todayKST();
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/entries/__tests__/validation.test.ts`
Expected: PASS (기존 `lib/__tests__/dates.test.ts` 3건도 함께 `npx vitest run`으로 통과 확인)

- [ ] **Step 5: `app/api/entries/new/route.ts` 수정**

세 가지를 바꾼다 — (a) 인라인 `hasContent`를 `hasEntryContent`로 교체, (b) 미래 날짜 400, (c) 생성된 id 반환.

```ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasEntryContent, isFutureKSTDate } from '@/lib/entries/validation';
import { updateProgress } from '@/utils/sync';
import { NextResponse } from 'next/server';
```

기존 22~31행(`const hasContent = …` ~ 400 반환)을 다음으로 교체:

```ts
    if (!user_book_id || !date || !hasEntryContent(quote, note)) {
      return NextResponse.json(
        { error: '문장(quote) 또는 생각(note) 중 하나는 필요합니다.' },
        { status: 400 }
      );
    }

    if (isFutureKSTDate(date)) {
      return NextResponse.json({ error: '미래 날짜로는 기록할 수 없습니다.' }, { status: 400 });
    }
```

insert 부분(기존 45~59행)을 다음으로 교체 — `.select('id').single()`로 생성 행을 받아 반환:

```ts
    const { data: created, error } = await supabase
      .from('entries')
      .insert({
        user_book_id,
        quote: typeof quote === 'string' && quote.trim() !== '' ? quote.trim() : null,
        note: typeof note === 'string' && note.trim() !== '' ? note.trim() : null,
        from_page: normFrom,
        to_page: normTo,
        date,
        is_private: is_private ?? false,
      })
      .select('id')
      .single();

    if (error || !created) {
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
    await updateProgress(book_id, user_id);
    return NextResponse.json({ id: created.id });
```

- [ ] **Step 6: `app/api/entries/[entry_id]/edit/route.ts` 수정 — 미래 날짜 거부**

`import { createSupabaseServerClient } …` 옆에 `import { isFutureKSTDate } from '@/lib/entries/validation';` 추가. 기존 32행 `if ('date' in body && body.date) patch.date = body.date;` 바로 아래에:

```ts
  if (typeof patch.date === 'string' && isFutureKSTDate(patch.date)) {
    return NextResponse.json({ error: '미래 날짜로는 기록할 수 없습니다.' }, { status: 400 });
  }
```

- [ ] **Step 7: `app/api/books/new/route.ts` 수정 — total_pages 선택화**

기존 20~23행을 다음으로 교체:

```ts
    if (!title || !author) {
      // total_pages, isbn, cover_url are optional
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
```

upsert의 객체를 `{ title, author, total_pages: total_pages ?? null, isbn, cover_url }`로 교체.

- [ ] **Step 8: 타입체크·전체 테스트·커밋**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 error, 테스트 전부 PASS

```bash
git add lib/entries app/api/entries app/api/books/new
git commit -m "✨ feat(entries): 기록 검증 유틸 추가·entry 생성 API가 id 반환·미래 날짜 거부·책 등록 페이지 수 선택화"
```

---

### Task 2: 책 등록 간소화 UI — 페이지 수 강제 제거

**Files:**
- Modify: `app/protected/books/new/_components/KakaoBookSearchForm.tsx`
- Modify: `app/protected/books/new/_components/NewBookForm.tsx`
- Modify: `components/books/BookDetailContent.tsx` (페이지 정보 없는 책 표시 가드)

**Interfaces:**
- Consumes: Task 1의 `POST /api/books/new` (total_pages nullable 허용).
- Produces: 없음 (말단 UI).

- [ ] **Step 1: `KakaoBookSearchForm.tsx` — 수동 입력 강제 해제**

`handleConfirm`의 페이지 결정부(기존 65~69행)를 다음으로 교체 — 스크래핑 실패 시 null로 등록 가능, 수동 입력은 있을 때만 검증:

```ts
    let pages: number | null = totalPages;
    if (pages == null && manualTotalPages.trim() !== '') {
      const parsed = parseInt(manualTotalPages, 10);
      if (isNaN(parsed) || parsed <= 0) {
        toast.error('페이지 수는 1 이상의 숫자여야 합니다');
        return;
      }
      pages = parsed;
    }
```

`fetch('/api/books/new', …)` body의 `total_pages: pages`로 교체. Modal의 실패 안내 카피(기존 196~198행)를 다음으로 교체:

```tsx
                  <p className="mb-1 text-ink">
                    페이지 수를 찾지 못했어요. 몰라도 등록할 수 있습니다.
                  </p>
```

같은 블록의 input `placeholder`를 `"총 페이지 수 (선택)"`으로 교체.

- [ ] **Step 2: `NewBookForm.tsx` — total_pages 선택화**

- 총 페이지 수 `FormLabel`을 `총 페이지 수 (선택)`으로, 해당 `Input`에서 `required` 제거.
- `handleSubmit` 상단(setLoading 전에) 클라이언트 검증 추가:

```ts
    if (totalPages.trim() !== '' && (isNaN(Number(totalPages)) || Number(totalPages) <= 0)) {
      setError('페이지 수는 1 이상의 숫자여야 합니다.');
      return;
    }
```

- body를 `total_pages: totalPages.trim() === '' ? null : Number(totalPages)`로 교체.

- [ ] **Step 3: `BookDetailContent.tsx` — 페이지 정보 없는 책 가드**

진행률 블록(104~111행 부근: 진행률 바 + `{last_read_page ?? 0} / {total_pages} PAGES` + `{progress ?? 0}% COMPLETED`)을 `total_pages != null`일 때만 렌더하도록 감싸고, null이면 대신 한 줄 표시:

```tsx
{total_pages != null ? (
  /* 기존 진행률 바 + PAGES/COMPLETED 블록 그대로 */
) : (
  <span className="text-caption text-ink-sub">
    {last_read_page != null ? `${last_read_page}쪽까지 읽음` : '페이지 정보 없음'}
  </span>
)}
```

주변 JSX 구조(모바일/데스크탑 두 벌이면 두 곳 모두)는 파일을 읽고 그대로 유지하되 조건만 추가한다. 128~134행 부근의 progress 기반 문구 분기도 `total_pages == null`이면 진행률 문구 대신 중립 문구(예: 기본 분기 문구)로 떨어지는지 확인하고, progress가 null이라 이미 기본 분기로 가면 손대지 않는다.

- [ ] **Step 4: 검증·커밋**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 error, 빌드 성공

```bash
git add app/protected/books/new components/books/BookDetailContent.tsx
git commit -m "✨ feat(books): 책 등록 페이지 수 입력 강제 제거 — 스크래핑 실패해도 등록 가능"
```

---

### Task 3: 기록 폼 대칭화 — 공용 EntryForm (quote·백필·페이지 선택화)

**Files:**
- Create: `components/entries/EntryForm.tsx`
- Rewrite: `app/protected/books/[book_id]/entry/new/_components/NewEntryForm.tsx`
- Rewrite: `app/protected/entry/[entry_id]/edit/_components/EditEntryForm.tsx`
- Modify: `app/protected/entry/[entry_id]/edit/page.tsx` (initialQuote 전달)

**Interfaces:**
- Consumes: `lib/entries/validation.ts`의 `hasEntryContent`, `lib/dates.ts`의 `todayKST`, `components/ui/*` 프리미티브, `types/book.ts`의 `Book`.
- Produces (Task 4·5는 이 폼을 쓰지 않지만, 페이지 래퍼가 이 시그니처에 의존):

```ts
export interface EntryFormValues {
  quote: string | null;
  note: string | null;
  from_page: number | null;
  to_page: number | null;
  date: string;        // 'yyyy-MM-dd'
  is_private: boolean;
}
interface EntryFormProps {
  book: Book;
  heading: string;               // "독서 기록" | "기록 수정"
  submitLabel: string;           // "기록 저장" | "수정 저장"
  initial?: Partial<{
    quote: string; note: string;
    fromPage: number | null; toPage: number | null;
    date: string; isPrivate: boolean;
  }>;
  onSubmit: (values: EntryFormValues) => Promise<string | null>; // 에러 메시지 또는 null(성공)
}
```

- [ ] **Step 1: `components/entries/EntryForm.tsx` 작성**

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import { Book } from '@/types/book';
import { todayKST } from '@/lib/dates';
import { hasEntryContent } from '@/lib/entries/validation';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import AnimatedSection from '@/components/ui/AnimatedSection';
import BackButton from '@/components/ui/BackButton';

export interface EntryFormValues {
  quote: string | null;
  note: string | null;
  from_page: number | null;
  to_page: number | null;
  date: string;
  is_private: boolean;
}

interface EntryFormProps {
  book: Book;
  heading: string;
  submitLabel: string;
  initial?: Partial<{
    quote: string;
    note: string;
    fromPage: number | null;
    toPage: number | null;
    date: string;
    isPrivate: boolean;
  }>;
  onSubmit: (values: EntryFormValues) => Promise<string | null>;
}

/** 신규/수정이 공유하는 기록 폼 — 문장·생각 중 하나만 있으면 저장, 날짜 백필 허용, 페이지 선택 */
export default function EntryForm({ book, heading, submitLabel, initial, onSubmit }: EntryFormProps) {
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [fromPage, setFromPage] = useState(initial?.fromPage?.toString() ?? '');
  const [toPage, setToPage] = useState(initial?.toPage?.toString() ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKST());
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasEntryContent(quote, note)) {
      setError('문장이나 생각 중 하나는 남겨주세요.');
      return;
    }
    if (fromPage !== '' && toPage !== '' && Number(fromPage) > Number(toPage)) {
      setError('시작 페이지는 종료 페이지보다 작거나 같아야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await onSubmit({
        quote: quote.trim() === '' ? null : quote.trim(),
        note: note.trim() === '' ? null : note.trim(),
        from_page: fromPage === '' ? null : Number(fromPage),
        to_page: toPage === '' ? null : Number(toPage),
        date,
        is_private: isPrivate,
      });
      if (message) setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="mb-6 flex items-center">
        <BackButton />
        <h1 className="text-page-title ml-4">{heading}</h1>
      </header>

      <AnimatedSection>
        <div className="mx-auto max-w-2xl space-y-8 py-4 sm:py-6">
          <div className="flex flex-col items-start justify-between gap-6 border-b border-hairline pb-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <Image
                src={book.cover_url ?? '/images/default-book-cover.png'}
                alt="책 표지"
                width={48}
                height={72}
                className="rounded object-cover"
              />
              <div className="flex flex-col">
                <strong className="font-serif text-xl leading-tight text-ink">
                  {book.title ?? '제목 없음'}
                </strong>
                <span className="mt-1 text-sm font-medium text-ink-sub">
                  {book.author ?? '저자 미상'}
                </span>
              </div>
            </div>
            <Chip
              selected={isPrivate}
              aria-pressed={isPrivate}
              onClick={() => setIsPrivate((v) => !v)}
              className="self-end sm:self-auto"
            >
              <Lock size={12} strokeWidth={1.75} aria-hidden />
              비공개
            </Chip>
          </div>

          <FormGroup>
            <FormLabel>문장</FormLabel>
            <Textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="책에서 마음에 남은 문장을 옮겨 적어보세요"
              rows={3}
              fullWidth
              className="resize-none font-serif"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>생각</FormLabel>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="이 문장에 대한 생각, 혹은 오늘의 감상"
              rows={5}
              fullWidth
              className="resize-none"
            />
          </FormGroup>

          <div className="flex flex-col gap-4 sm:flex-row">
            <FormGroup className="min-w-0 flex-1">
              <FormLabel>시작 페이지 (선택)</FormLabel>
              <Input
                type="number"
                placeholder="ex. 10"
                value={fromPage}
                onChange={(e) => setFromPage(e.target.value)}
                className="w-full"
              />
            </FormGroup>
            <FormGroup className="min-w-0 flex-1">
              <FormLabel>종료 페이지 (선택)</FormLabel>
              <Input
                type="number"
                placeholder="ex. 25"
                value={toPage}
                max={book.total_pages ?? undefined}
                onChange={(e) => setToPage(e.target.value)}
                className="w-full"
              />
            </FormGroup>
          </div>

          <FormGroup className="w-full min-w-0">
            <FormLabel>읽은 날짜</FormLabel>
            <Input
              type="date"
              value={date}
              max={todayKST()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full"
            />
          </FormGroup>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? '저장 중...' : submitLabel}
            </Button>
          </div>
        </div>
      </AnimatedSection>
    </form>
  );
}
```

- [ ] **Step 2: `NewEntryForm.tsx` 재작성 — 얇은 래퍼 (props 시그니처 불변)**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Book } from '@/types/book';
import EntryForm, { EntryFormValues } from '@/components/entries/EntryForm';

interface Props {
  userBookId: string;
  userId: string;
  book: Book;
  bookId: string;
}

export default function NewEntryForm({ userBookId, userId, book, bookId }: Props) {
  const router = useRouter();

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    try {
      const res = await fetch('/api/entries/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          user_book_id: userBookId,
          book_id: bookId,
          user_id: userId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? '기록 저장 중 오류가 발생했습니다.';
      }
      toast.success('기록이 저장되었습니다.');
      router.push(`/protected/books/${bookId}`);
      return null;
    } catch {
      return '서버와 통신 중 오류가 발생했습니다.';
    }
  };

  return <EntryForm book={book} heading="독서 기록" submitLabel="기록 저장" onSubmit={handleSubmit} />;
}
```

- [ ] **Step 3: `EditEntryForm.tsx` 재작성 — initialQuote 추가**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Book } from '@/types/book';
import EntryForm, { EntryFormValues } from '@/components/entries/EntryForm';

interface Props {
  entryId: string;
  book: Book;
  initialQuote: string;
  initialNote: string;
  initialFromPage: number | null;
  initialToPage: number | null;
  initialIsPrivate: boolean;
  initialDate: string;
}

export default function EditEntryForm({
  entryId,
  book,
  initialQuote,
  initialNote,
  initialFromPage,
  initialToPage,
  initialIsPrivate,
  initialDate,
}: Props) {
  const router = useRouter();

  const handleSubmit = async (values: EntryFormValues): Promise<string | null> => {
    try {
      const res = await fetch(`/api/entries/${entryId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? '수정에 실패했어요.';
      }
      router.push(`/protected/entry/${entryId}`);
      return null;
    } catch {
      return '서버와 통신 중 오류가 발생했습니다.';
    }
  };

  return (
    <EntryForm
      book={book}
      heading="기록 수정"
      submitLabel="수정 저장"
      initial={{
        quote: initialQuote,
        note: initialNote,
        fromPage: initialFromPage,
        toPage: initialToPage,
        date: initialDate,
        isPrivate: initialIsPrivate,
      }}
      onSubmit={handleSubmit}
    />
  );
}
```

- [ ] **Step 4: `app/protected/entry/[entry_id]/edit/page.tsx` — initialQuote 전달**

`<EditEntryForm` 호출에 `initialQuote={entry.quote ?? ''}` prop 추가 (기존 props 유지).

- [ ] **Step 5: 검증·커밋**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: 전부 통과. (참고: `app/protected/books/[book_id]/entry/new/page.tsx`는 props 불변이므로 수정 불필요 — diff에 포함되면 잘못이다.)

```bash
# 대괄호 경로는 zsh 글롭을 피하려고 따옴표로 감싼다
git add components/entries "app/protected/books/[book_id]/entry/new" "app/protected/entry/[entry_id]/edit"
git commit -m "✨ feat(entries): 신규/수정 기록 폼 대칭화 — 공용 EntryForm, quote 입력, 날짜 백필, 페이지 선택화"
```

---

### Task 4: 홈 composer — 입력창 + 책 칩

**Files:**
- Modify: `lib/dashboard/fetchDashboardData.ts` (recentUserBookId 추가)
- Create: `app/protected/dashboard/_components/Composer.tsx`
- Modify: `app/protected/dashboard/page.tsx` (배치)

**Interfaces:**
- Consumes: Task 1의 `POST /api/entries/new` → `{ id: string }` 반환, `types/book.ts`의 `MyBook`(`{ id, book_id, progress, created_at, is_finished, last_read_page, books: Book }`), `todayKST()`, Chip/Textarea/Button/Card 프리미티브.
- Produces:
  - `fetchDashboardData()` 반환 타입에 `recentUserBookId: string | null` 필드 추가.
  - `Composer` props: `{ books: MyBook[]; recentUserBookId: string | null; userId: string }`.
  - Task 5가 이 컴포넌트의 저장 성공 상태(`savedEntry`)를 확장한다.

- [ ] **Step 1: `fetchDashboardData.ts` — 최근 기록한 책 조회 추가**

반환 타입에 `recentUserBookId: string | null;` 추가. `Promise.all` 배열 마지막에 쿼리 추가:

```ts
      supabase
        .from('entries')
        .select('user_book_id')
        .in('user_book_id', bookIds)
        .order('created_at', { ascending: false })
        .limit(1),
```

구조 분해를 `const [{ data: myBooks }, { data: entries }, { data: weekEntries }, { data: allEntryDates }, { data: recentEntry }] = …`로 확장하고, return 객체에 추가:

```ts
    recentUserBookId: recentEntry?.[0]?.user_book_id ?? null,
```

- [ ] **Step 2: `Composer.tsx` 작성**

시안 "먹과 종이"의 홈 입력창: 카드 안에 책 칩 줄 → 문장 textarea(serif) → 하단에 문장/생각 모드 칩·비공개 칩·저장 버튼. 진행중 책이 없으면 렌더하지 않는다(NoBooksSection이 담당).

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, Plus } from 'lucide-react';
import { MyBook } from '@/types/book';
import { todayKST } from '@/lib/dates';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface ComposerProps {
  books: MyBook[];
  recentUserBookId: string | null;
  userId: string;
}

type Mode = 'quote' | 'note';

interface SavedEntry {
  id: string;
  mode: Mode;
  text: string;
  bookTitle: string;
}

const MAX_BOOK_CHIPS = 4;

/** 홈 최상단 기록 입력창 — 문장 한 줄로 기록을 시작한다 (스펙 §4) */
export default function Composer({ books, recentUserBookId, userId }: ComposerProps) {
  const router = useRouter();
  const initialSelected =
    books.find((b) => b.id === recentUserBookId)?.id ?? books[0]?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [mode, setMode] = useState<Mode>('quote');
  const [text, setText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedEntry, setSavedEntry] = useState<SavedEntry | null>(null);

  if (books.length === 0) return null;

  const chipBooks = books.slice(0, MAX_BOOK_CHIPS);
  const selectedBook = books.find((b) => b.id === selectedId) ?? null;

  const handleSave = async () => {
    if (!selectedBook || text.trim() === '' || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/entries/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_book_id: selectedBook.id,
          quote: mode === 'quote' ? text.trim() : null,
          note: mode === 'note' ? text.trim() : null,
          date: todayKST(),
          is_private: isPrivate,
          book_id: selectedBook.book_id,
          user_id: userId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) {
        toast.error(data?.error ?? '저장에 실패했어요.');
        return;
      }
      setSavedEntry({
        id: data.id,
        mode,
        text: text.trim(),
        bookTitle: selectedBook.books.title,
      });
      setText('');
      setIsPrivate(false);
      router.refresh();
    } catch {
      toast.error('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (savedEntry) {
    // Task 5에서 확장 UI로 교체된다 — Task 4 시점에는 최소 확인 카드만
    return (
      <Card hoverable={false} className="mb-8">
        <p className="font-serif text-quote text-ink">{savedEntry.text}</p>
        <p className="mt-2 text-caption text-ink-sub">{savedEntry.bookTitle}</p>
      </Card>
    );
  }

  return (
    <Card hoverable={false} className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        {chipBooks.map((b) => (
          <Chip
            key={b.id}
            selected={b.id === selectedId}
            dot={b.id === selectedId}
            onClick={() => setSelectedId(b.id)}
          >
            <span className="max-w-[8rem] truncate">{b.books.title}</span>
          </Chip>
        ))}
        <Chip onClick={() => router.push('/protected/books/new')} aria-label="새 책 등록">
          <Plus size={12} strokeWidth={1.75} aria-hidden />새 책
        </Chip>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="오늘 마음에 남은 문장을 남겨보세요"
        rows={3}
        fullWidth
        className="mt-4 resize-none font-serif"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Chip selected={mode === 'quote'} onClick={() => setMode('quote')}>
            문장
          </Chip>
          <Chip selected={mode === 'note'} onClick={() => setMode('note')}>
            생각
          </Chip>
          <Chip
            selected={isPrivate}
            aria-pressed={isPrivate}
            onClick={() => setIsPrivate((v) => !v)}
          >
            <Lock size={12} strokeWidth={1.75} aria-hidden />
            비공개
          </Chip>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSubmitting || text.trim() === ''}
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: `dashboard/page.tsx` 배치**

`import Composer from './_components/Composer';` 추가. `AnimatedSection` 안, `WeeklyStreakSection` 위에:

```tsx
      <AnimatedSection>
        <Composer
          books={books ?? []}
          recentUserBookId={data.recentUserBookId}
          userId={user.id}
        />
        <WeeklyStreakSection streak={streak} weekActivity={weekActivity} entry={entry} />
        …
```

- [ ] **Step 4: 검증·커밋**

Run: `npx tsc --noEmit && npm run build`
Expected: 통과

```bash
git add lib/dashboard/fetchDashboardData.ts app/protected/dashboard
git commit -m "✨ feat(dashboard): 홈 입력창 composer — 책 칩 선택·문장/생각 모드·즉시 저장"
```

---

### Task 5: 저장 후 확장 — 같은 행 UPDATE

**Files:**
- Modify: `app/protected/dashboard/_components/Composer.tsx`

**Interfaces:**
- Consumes: Task 4의 `savedEntry` 상태, `PATCH /api/entries/[entry_id]/edit` (partial patch — 보낸 키만 갱신, 페이지 정규화·미래 날짜 거부 내장), Seal/Input 프리미티브.
- Produces: 없음 (플로우 말단).

- [ ] **Step 1: 확장 상태·핸들러 추가**

Composer에 상태 추가:

```ts
  const [showExtraText, setShowExtraText] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [extraText, setExtraText] = useState('');
  const [fromPage, setFromPage] = useState('');
  const [toPage, setToPage] = useState('');
```

리셋 헬퍼와 확장 저장 핸들러 추가 (컴포넌트 본문, handleSave 아래):

```ts
  const resetAll = () => {
    setSavedEntry(null);
    setShowExtraText(false);
    setShowPages(false);
    setExtraText('');
    setFromPage('');
    setToPage('');
    setMode('quote');
  };

  const handleExpand = async () => {
    if (!savedEntry || isSubmitting) return;
    if (fromPage !== '' && toPage !== '' && Number(fromPage) > Number(toPage)) {
      toast.error('시작 페이지는 종료 페이지보다 작거나 같아야 합니다.');
      return;
    }
    const body: Record<string, unknown> = {};
    if (showExtraText && extraText.trim() !== '') {
      body[savedEntry.mode === 'quote' ? 'note' : 'quote'] = extraText.trim();
    }
    if (showPages && (fromPage !== '' || toPage !== '')) {
      body.from_page = fromPage === '' ? null : Number(fromPage);
      body.to_page = toPage === '' ? null : Number(toPage);
    }
    if (Object.keys(body).length === 0) {
      resetAll();
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/entries/${savedEntry.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? '덧붙이기에 실패했어요.');
        return;
      }
      toast.success('기록에 덧붙였어요.');
      resetAll();
      router.refresh();
    } catch {
      toast.error('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
```

- [ ] **Step 2: 저장 완료 카드 교체**

Task 4의 최소 확인 카드(`if (savedEntry) { … }` 블록)를 다음으로 교체:

```tsx
  if (savedEntry) {
    return (
      <Card hoverable={false} className="mb-8">
        <Seal>오늘의 기록</Seal>
        <p className="mt-2 font-serif text-quote text-ink">{savedEntry.text}</p>
        <p className="mt-1 text-caption text-ink-sub">{savedEntry.bookTitle}</p>

        {!showExtraText && !showPages ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip onClick={() => setShowExtraText(true)}>
              {savedEntry.mode === 'quote' ? '생각 덧붙이기' : '문장 덧붙이기'}
            </Chip>
            <Chip onClick={() => setShowPages(true)}>페이지 남기기</Chip>
            <Chip onClick={resetAll}>닫기</Chip>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {showExtraText && (
              <Textarea
                value={extraText}
                onChange={(e) => setExtraText(e.target.value)}
                placeholder={
                  savedEntry.mode === 'quote'
                    ? '이 문장에 대한 생각을 덧붙여보세요'
                    : '책에서 마음에 남은 문장을 옮겨 적어보세요'
                }
                rows={3}
                fullWidth
                className="resize-none"
              />
            )}
            {showPages && (
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="시작 페이지"
                  value={fromPage}
                  onChange={(e) => setFromPage(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="종료 페이지"
                  value={toPage}
                  onChange={(e) => setToPage(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {!showExtraText && (
                <Chip onClick={() => setShowExtraText(true)}>
                  {savedEntry.mode === 'quote' ? '생각 덧붙이기' : '문장 덧붙이기'}
                </Chip>
              )}
              {!showPages && <Chip onClick={() => setShowPages(true)}>페이지 남기기</Chip>}
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="ghost" onClick={resetAll}>
                  닫기
                </Button>
                <Button size="sm" onClick={handleExpand} disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '덧붙이기'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }
```

import에 `Seal`(`@/components/ui/Seal`)과 `Input`(`@/components/ui/Input`) 추가.

- [ ] **Step 3: 검증·커밋**

Run: `npx tsc --noEmit && npm run build`
Expected: 통과

```bash
git add app/protected/dashboard/_components/Composer.tsx
git commit -m "✨ feat(dashboard): 저장 후 확장 — 생각/문장 덧붙이기·페이지 남기기를 같은 행 UPDATE로"
```

---

### Task 6: 회귀 확인 — 날짜 소스·이모지·죽은 참조

**Files:**
- Modify: 아래 grep에서 걸리는 파일들 (예상: 없거나 소수)

**Interfaces:** 없음 — 검증 태스크.

- [ ] **Step 1: 작성 경로의 UTC 날짜 소스 제거 확인**

Run: `grep -rn "toISOString().split" app/ components/ --include='*.tsx' --include='*.ts'`
Expected: 기록 생성/수정/composer 경로에는 0건. (`lib/dashboard/fetchDashboardData.ts`의 스트릭 계산 등 조회 경로는 Plan ④ 범위이므로 남아 있어도 무방 — 남은 위치를 보고서에 기록만 한다.)
걸린 작성 경로가 있으면 `todayKST()`로 교체한다.

- [ ] **Step 2: 색상 dark: 프리픽스·구 원색 검사**

Run: `grep -rn "dark:" app/protected/dashboard app/protected/books app/protected/entry components/entries components/books --include='*.tsx' | grep -v "라이트/다크"` 와 `grep -rn "3B82F6\|#3b82f6" app/ components/`
Expected: 0건.

- [ ] **Step 3: 전체 검증**

Run: `npx tsc --noEmit && npx vitest run && npm run lint && npm run build`
Expected: 전부 통과.

- [ ] **Step 4: 커밋 (수정이 있었던 경우만)**

```bash
git add -A && git commit -m "🐛 fix(entries): Plan ③ 회귀 정리"
```

---

## 검증 (스펙 §12 대응)

- 기록 플로우: 문장만 입력(칩 선택 + 텍스트 + 저장 = 2탭) / 확장 UPDATE(행 분리 없음 — 같은 entry id로 PATCH) / 과거 날짜 백필(신규 폼에서 date 편집 가능, 미래는 API가 400) / 비공개 토글.
- 책 등록: 카카오 스크래핑 실패 시에도 등록 완료 가능, 직접 입력 탭에서 페이지 수 생략 가능, 페이지 없는 책의 상세 화면 깨지지 않음.
- 자동 검증은 tsc/vitest/lint/build까지 — 로그인이 필요한 화면 QA는 프로덕션 데이터 금지 원칙에 따라 사용자 수동 확인으로 넘긴다(최종 보고서에 체크리스트 첨부).
