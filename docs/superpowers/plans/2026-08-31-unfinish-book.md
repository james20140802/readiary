# 완독 취소 + finished_at Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실수로 누른 완독을 되돌릴 수 있게 책 상세의 완독 배너에 조용한 "완독 취소" 액션을 추가하고, `user_books.finished_at` 타임스탬프를 도입해 완독 시각을 기록한다(취소 시 null).

**Architecture:** DB는 Supabase 원격 PostgreSQL 하나뿐(로컬 스택 없음). 마이그레이션 SQL을 `supabase/migrations/`에 기록하고 원격 적용은 **컨트롤러가 Supabase MCP `apply_migration`으로 수행**한다(플랜①에서 승인된 관례) — implementer는 SQL 파일 작성까지만 한다. 완독 처리는 기존 `MarkAsFinishedButton`처럼 클라이언트 Supabase update로 직접 수행하며(별도 API route 없음), 취소도 같은 패턴을 따른다. RLS는 본인 `user_books` 행만 update를 허용하므로 서버 검증 불필요.

**Tech Stack:** Next.js App Router, Supabase JS(client), Tailwind, headlessui Modal(`components/ui/Modal.tsx`), vitest.

**Spec:** Notion 이슈 "완독 취소(되돌리기) — 실수로 누른 완독을 해제할 수 없음" (https://app.notion.com/p/3cceedeede86814bbe81e673d68bf9e7). 사용자 확정 사항: 버튼 위치는 **완독 배너 안 ghost 버튼 + 확인 다이얼로그** (2026-08-31 사용자 선택).

## Global Constraints

- 검증·QA에서 프로덕션 Supabase에 로그인·계정 생성·데이터 삽입 금지. 검증은 `npm run lint`, `npm run test`, `npm run build`로만 한다.
- `.env.local`은 로컬 전용·git-ignored — 커밋·출력 금지.
- 완독 취소 버튼은 내 책일 때만 보인다 — 배너가 이미 `!isFriend` 가드 안에 있으므로(BookDetailContent.tsx:127) 배너 안에 두면 자동 충족. 가드 밖으로 옮기지 말 것.
- 기존 완독 도서의 `finished_at`은 백필하지 않는다(정확한 완독 시각을 알 수 없음 — null 유지). UI 표기 변경(발췌집 "마지막 문장" 날짜 등)은 이번 범위 밖.
- 사용자 문구 톤: 조용하고 담백하게. 스탬프·과장 금지.

## 파생 효과(코드 변경 불필요 — 확인 문구에만 반영)

`is_finished=false`로 돌아가면 기존 로직이 알아서 처리한다:
- 발췌집 페이지는 미완독이면 책 상세로 redirect (`app/protected/books/[book_id]/excerpts/page.tsx:20-22`)
- 책장 DONE 뱃지·완독 필터에서 빠짐 (`components/books/BookList.tsx`)
- 프로필 회고 목록·"완독한 책 N권" 통계에서 빠짐
- 대시보드 "읽는 중" 섹션에 다시 나타남 (`lib/dashboard/fetchDashboardData.ts:48`)
- 완독 관련 알림·트리거·DB 사이드이펙트 없음 — 순수 boolean 토글이라 데이터상 안전

---

### Task 1: `finished_at` 마이그레이션 + 타입

**Files:**
- Create: `supabase/migrations/20260831000000_add_finished_at.sql`
- Modify: `types/supabase.d.ts:379-409` (user_books Row/Insert/Update)

**Interfaces:**
- Produces: `user_books.finished_at: timestamptz | null` 컬럼(타입상 `string | null`). Task 2의 update payload가 이 컬럼에 의존.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/20260831000000_add_finished_at.sql`:

```sql
-- user_books.finished_at: 완독 선언 시각. 완독 취소 시 null로 되돌린다.
-- 기존 완독 도서는 정확한 완독 시각을 알 수 없어 백필하지 않는다(null 유지, UI는 기존 대체 표기 유지).
alter table public.user_books
  add column if not exists finished_at timestamptz;
```

- [ ] **Step 2: 타입 갱신**

`types/supabase.d.ts`의 `user_books` 블록(379행 부근) — Row에 `finished_at: string | null;`, Insert/Update에 `finished_at?: string | null;`를 각각 `created_at` 다음 줄(알파벳 순서)에 추가. 예: Row 블록은 다음이 된다:

```ts
        Row: {
          book_id: string;
          created_at: string | null;
          finished_at: string | null;
          id: string;
          is_finished: boolean | null;
          last_read_page: number | null;
          progress: number | null;
          started_at: string | null;
          user_id: string;
        };
```

(Insert/Update는 같은 위치에 `finished_at?: string | null;`.)

- [ ] **Step 3: 검증**

Run: `npm run lint && npm run test && npm run build`
Expected: 전부 pass (기존 vitest 스위트 포함).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260831000000_add_finished_at.sql types/supabase.d.ts
git commit -m "🗃️ feat(books): user_books.finished_at 컬럼 추가 — 완독 시각 기록 기반"
```

**참고(implementer는 수행하지 않음):** 원격 적용은 컨트롤러가 Supabase MCP `apply_migration`(name: `add_finished_at`)으로 이 SQL 전문을 적용한다.

---

### Task 2: 완독 토글 양방향 — 완독 시 finished_at 기록 + 배너에 완독 취소

**Files:**
- Modify: `components/books/MarkAsFinishedButton.tsx:16-33`
- Create: `components/books/UnfinishBookButton.tsx`
- Modify: `components/books/BookDetailContent.tsx:148-163` (완독 배너)

**Interfaces:**
- Consumes: Task 1의 `finished_at` 컬럼(`string | null`).
- Produces: `UnfinishBookButton({ userBookId: string, onUnfinish: () => void })` — BookDetailContent가 `onUnfinish={() => setIsFinished(false)}`로 사용.

- [ ] **Step 1: MarkAsFinishedButton이 finished_at을 기록하게 수정**

`components/books/MarkAsFinishedButton.tsx`:
- L19의 payload를 `{ is_finished: true, finished_at: new Date().toISOString() }`로 변경.
- L31의 `color="primary"`는 Button에 없는 prop(DOM으로 새는 잘못된 속성)이므로 `variant="primary"`로 수정.

- [ ] **Step 2: UnfinishBookButton 작성**

`components/books/UnfinishBookButton.tsx` 전문:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface UnfinishBookButtonProps {
  userBookId: string;
  onUnfinish: () => void;
}

export default function UnfinishBookButton({ userBookId, onUnfinish }: UnfinishBookButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnfinish = async () => {
    setIsSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('user_books')
      .update({ is_finished: false, finished_at: null })
      .eq('id', userBookId);

    if (!updateError) {
      setIsDialogOpen(false);
      setIsSubmitting(false);
      onUnfinish();
      router.refresh();
    } else {
      setError('완독 취소에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setIsDialogOpen(true)}>
        완독 취소
      </Button>
      <Modal
        isOpen={isDialogOpen}
        onClose={() => {
          if (!isSubmitting) setIsDialogOpen(false);
        }}
      >
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink">완독을 취소할까요?</h2>
          <p className="text-sm text-ink-sub">
            이 책은 다시 읽는 중으로 돌아가고, 발췌집은 다음 완독까지 잠겨요. 기록과 문장은
            그대로 남습니다.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              돌아가기
            </Button>
            <Button size="sm" variant="primary" onClick={handleUnfinish} disabled={isSubmitting}>
              {isSubmitting ? '취소하는 중...' : '완독 취소'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
```

디자인 룰링: 배너 안 트리거는 ghost(조용한 텍스트형), 확인 모달의 확정 버튼은 primary(먹 배경) — 데이터 파괴가 아니므로 danger는 쓰지 않는다. 닫기 라벨은 "취소"와의 혼동을 피해 "돌아가기".

- [ ] **Step 3: 완독 배너에 통합**

`components/books/BookDetailContent.tsx`:
- import 추가: `import UnfinishBookButton from './UnfinishBookButton';`
- L157-161의 발췌집 보기 Link 뒤(배너 맨 오른쪽 요소로)에 추가:

```tsx
              <Link href={`/protected/books/${book_id}/excerpts`}>
                <Button size="sm" variant="secondary">
                  발췌집 보기
                </Button>
              </Link>
              <UnfinishBookButton userBookId={id} onUnfinish={() => setIsFinished(false)} />
```

배너는 이미 `!isFriend` 가드 안(L127)이라 친구 뷰 노출 없음 — 가드 구조를 바꾸지 말 것.

- [ ] **Step 4: 검증**

Run: `npm run lint && npm run test && npm run build`
Expected: 전부 pass. (컴포넌트 테스트 인프라(testing-library/jsdom)가 레포에 없어 UI 자동 테스트는 범위 밖 — 프로덕션 로그인 QA 금지 제약상 수동 검증도 하지 않는다.)

- [ ] **Step 5: Commit**

```bash
git add components/books/MarkAsFinishedButton.tsx components/books/UnfinishBookButton.tsx components/books/BookDetailContent.tsx
git commit -m "✨ feat(books): 완독 배너에 완독 취소 액션 추가 — 확인 모달 + finished_at 왕복"
```
