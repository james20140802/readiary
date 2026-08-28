# Plan ④ — 홈·회고 (KST 스트릭 순화·회상 카드·월말 회고·발췌집·프로필 회고) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈("오늘") 탭을 스펙 §5 구조(입력창 → 회상 카드 → 주간 리듬 → 읽고 있는 책)로 재구성하고, 회고 기능 3종(회상 카드·발췌집·월말 회고)과 프로필 회고 영역을 추가하며, 스트릭을 KST 기준·"이번 주 문장 N개" 표현으로 순화한다.

**Architecture:** 회고 3종은 전부 파생 뷰다 — 새 테이블·스키마 변경 없음. 날짜 연산은 `yyyy-MM-dd` 문자열만 다루는 순수 함수(`lib/dashboard/streak.ts`, `lib/retrospect/monthlyRecap.ts`, `lib/recall/selectRecall.ts`)로 분리해 vitest로 검증하고, 서버 페칭 함수(`fetchDashboardData` 등)는 `todayKST()`를 주입해 이 순수 함수를 호출한다. 데이터 페칭은 기존 관례대로 API 라우트가 아닌 서버 함수의 Supabase 직접 쿼리(`fetchSocialFeedEntries.ts` 패턴: user_books id 목록 → `entries.in(...)`).

**Tech Stack:** Next.js 16 App Router(`--webpack`), Tailwind 3.4(먹과 종이 토큰), Supabase, vitest, date-fns(+date-fns-tz), lucide-react. 새 dependency 없음.

**Spec:** `docs/superpowers/specs/2026-08-25-sentence-centric-redesign-design.md` (§5 화면 구조·회고 기능 3종·스트릭 순화, §9 기술부채 일부)

## Global Constraints

- 새 dependency 추가 금지 (기존 package.json 안에서만).
- **DB 스키마 변경 금지** — 회고는 전부 파생 뷰. `user_books`에 완독일 컬럼이 없으므로 발췌집의 "완독일"은 그 책의 **마지막 기록 날짜**로 대체 표기한다(이 플랜의 확정 결정).
- 색상에 `dark:` 프리픽스 금지 — CSS 변수 토큰이 자동 전환한다 (`bg-paper`, `text-ink`, `bg-card`, `border-hairline`, `text-accent` 등만 사용). 원색 Tailwind 팔레트·하드코딩 hex 금지.
- 그림자 금지(헤어라인 보더), 기울어진 도장 박스 금지, 구 원색 `#3B82F6` 금지. 날짜·상태 표식은 `components/ui/Seal` 사용.
- UI 카피는 한국어. **장식 이모지 금지** — 이 플랜에서 수정하는 컴포넌트의 기존 이모지(📅/🔥/📚/✓ 등)는 제거한다. 아이콘이 필요하면 lucide-react(strokeWidth 1.75).
- 콘텐츠(문장·책 제목·회고 카피 헤드라인)는 `font-serif`, UI 크롬은 기본 산세리프. 인용 본문은 `text-quote` 유틸 사용.
- 날짜 연산은 `lib/dates.ts`의 `todayKST()`/`toKSTDateString()` 기반 — `new Date()`로 오늘 날짜를 새로 판정하는 코드를 만들지 않는다(기존 코드에서 발견 시 제거 대상).
- 주간은 **일요일 시작**(`weekStartsOn: 0`) — 기존 관례 유지.
- UI는 `components/ui` 프리미티브(Button, Card, Chip, Seal, AnimatedSection 등) 우선 사용. 프리미티브 시그니처 변경 금지.
- 회상 카드·월말 회고·프로필 회고는 **본인 데이터 전용**(비공개 기록 포함) — 타인 프로필에는 렌더하지 않는다.
- 검증·QA 과정에서 프로덕션 Supabase에 로그인·데이터 삽입 금지.
- 커밋은 gitmoji + 한국어, 본문에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` 트레일러.

## 이연/제외 (이 플랜에서 하지 않음)

- 소셜 탭 일원화·문장 카드 이미지 공유·동적 OG → Plan ⑤. (홈의 피드 프리뷰 **제거**는 이 플랜, 소셜 탭 자체는 손대지 않음.)
- 인앱 알림 → Plan ⑥. 랜딩·이미지 최적화·lint 복구 → Plan ⑦.
- 페이지 통계 ±1 불일치는 **이미 해소됨을 확인** (`lib/stats/getUserStats.ts:36`이 `to - from + 1` 사용, 다른 합산 코드 없음) — 이 플랜에서는 잘못된 구식 계산을 담은 데드 코드(StatsSection) 삭제로 마무리.
- Web Push 리마인더 → Plan ⑥ 이후.
- 강조색 확정(잉크 vs 주홍)은 코드 변경 없음 — `data-accent` 토글 유지.

---

### Task 1: KST 주간·스트릭 순수 함수 (`lib/dashboard/streak.ts`)

**Files:**
- Create: `lib/dashboard/streak.ts`
- Test: `lib/dashboard/__tests__/streak.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수 — `yyyy-MM-dd` 문자열만 입출력, date-fns `parseISO`/`format`/`startOfWeek`/`addDays`/`subDays` 사용 가능. 문자열 `yyyy-MM-dd`를 `parseISO`로 파싱하면 로컬 자정이 되지만, 같은 방식으로 포맷만 되돌리므로 타임존 무관하게 안정적이다).
- Produces (Task 2·3이 사용):
  - `weekDatesKST(todayKst: string): string[]` — todayKst가 속한 주(일요일 시작)의 7개 날짜 문자열.
  - `calcStreak(recordedDates: Set<string>, todayKst: string): number` — todayKst부터 거꾸로 연속 기록일 수. 오늘 기록이 없으면 어제부터 세기 시작한다(오늘 아직 안 썼다고 어제까지의 연속이 0이 되지 않게).
  - `calcWeekActivity(recordedDates: Set<string>, todayKst: string): boolean[]` — 이번 주 7일 각각 기록 여부.
  - `countWeekEntries(entryDates: string[], todayKst: string): number` — 이번 주에 속한 기록 개수(같은 날 여러 건이면 전부 센다 — "이번 주 문장 N개"의 N).

- [ ] **Step 1: 실패하는 테스트 작성** — `lib/dashboard/__tests__/streak.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { weekDatesKST, calcStreak, calcWeekActivity, countWeekEntries } from '../streak';

// 2026-08-27은 목요일. 그 주의 일요일은 2026-08-23.
describe('weekDatesKST', () => {
  it('일요일 시작 7일을 돌려준다', () => {
    expect(weekDatesKST('2026-08-27')).toEqual([
      '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26',
      '2026-08-27', '2026-08-28', '2026-08-29',
    ]);
  });
  it('일요일 당일이면 그 날이 첫 칸이다', () => {
    expect(weekDatesKST('2026-08-23')[0]).toBe('2026-08-23');
  });
});

describe('calcStreak', () => {
  it('오늘 포함 연속 기록일을 센다', () => {
    const rec = new Set(['2026-08-27', '2026-08-26', '2026-08-25', '2026-08-23']);
    expect(calcStreak(rec, '2026-08-27')).toBe(3);
  });
  it('오늘 기록이 없으면 어제부터 센다 (아직 안 쓴 오늘이 스트릭을 끊지 않는다)', () => {
    const rec = new Set(['2026-08-26', '2026-08-25']);
    expect(calcStreak(rec, '2026-08-27')).toBe(2);
  });
  it('오늘도 어제도 없으면 0', () => {
    expect(calcStreak(new Set(['2026-08-20']), '2026-08-27')).toBe(0);
  });
});

describe('calcWeekActivity', () => {
  it('이번 주 7일의 기록 여부 배열', () => {
    const rec = new Set(['2026-08-24', '2026-08-27']);
    expect(calcWeekActivity(rec, '2026-08-27')).toEqual([
      false, true, false, false, true, false, false,
    ]);
  });
});

describe('countWeekEntries', () => {
  it('이번 주에 속한 기록만, 같은 날 중복 포함으로 센다', () => {
    const dates = ['2026-08-27', '2026-08-27', '2026-08-23', '2026-08-22', '2026-08-30'];
    expect(countWeekEntries(dates, '2026-08-27')).toBe(3);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run lib/dashboard/__tests__/streak.test.ts` → 모듈 없음으로 FAIL.

- [ ] **Step 3: 구현** — `lib/dashboard/streak.ts`

```ts
import { addDays, format, parseISO, startOfWeek, subDays } from 'date-fns';

const DAY = 'yyyy-MM-dd';

/** todayKst가 속한 주(일요일 시작)의 7개 날짜 문자열 */
export function weekDatesKST(todayKst: string): string[] {
  const start = startOfWeek(parseISO(todayKst), { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), DAY));
}

/** todayKst부터 거꾸로 연속 기록일 수. 오늘 기록이 없으면 어제부터 센다. */
export function calcStreak(recordedDates: Set<string>, todayKst: string): number {
  let cursor = parseISO(todayKst);
  if (!recordedDates.has(todayKst)) cursor = subDays(cursor, 1);
  let streak = 0;
  while (recordedDates.has(format(cursor, DAY))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function calcWeekActivity(recordedDates: Set<string>, todayKst: string): boolean[] {
  return weekDatesKST(todayKst).map((d) => recordedDates.has(d));
}

/** 이번 주에 속한 기록 개수 — 같은 날 여러 건이면 전부 센다 */
export function countWeekEntries(entryDates: string[], todayKst: string): number {
  const week = new Set(weekDatesKST(todayKst));
  return entryDates.filter((d) => week.has(d)).length;
}
```

- [ ] **Step 4: 테스트 통과 확인** — `npx vitest run lib/dashboard/__tests__/streak.test.ts` → PASS. 기존 전체 테스트도 확인: `npx vitest run`.

- [ ] **Step 5: 커밋** — `✨ feat(dashboard): KST 기준 주간·스트릭 순수 함수 추가`

---

### Task 2: `fetchDashboardData` KST 전환 + 주간 문장 수 반환

**Files:**
- Modify: `lib/dashboard/fetchDashboardData.ts`

**Interfaces:**
- Consumes: Task 1의 `calcStreak`/`calcWeekActivity`/`countWeekEntries`, `lib/dates.ts`의 `todayKST()`.
- Produces (Task 3·5가 사용): 반환 객체에 두 필드 추가 —
  - `todayKst: string` (서버가 판정한 KST 오늘. 클라이언트가 `new Date()`로 재판정하지 않도록 내려준다)
  - `weeklyCount: number` ("이번 주 문장 N개"의 N)
  - 기존 `streak`, `weekActivity`, `entry`, `books`, `recentUserBookId` 필드는 이름·타입 유지.

- [ ] **Step 1: 날짜 판정 교체** — 파일 상단의 로컬 타임존 코드를 제거하고 KST로 통일:
  - `const today = new Date(); today.setHours(0,0,0,0);` 및 `startOfWeek(new Date(), ...)` 삭제.
  - `const todayKst = todayKST();`로 대체하고, 주간 범위가 필요한 쿼리는 Task 1의 `weekDatesKST(todayKst)` 첫/끝 요소를 사용한다.
  - 스트릭용 전체 기록 날짜 조회(`allEntryDates`)는 유지하되, 이후 계산을 `calcStreak(new Set(dates), todayKst)`/`calcWeekActivity(...)`로 교체. 기존 while 루프·`format(cursor, ...)` 수동 계산 삭제.
  - "오늘의 기록" 1건 조회는 `created_at` 기준(`.gte('created_at', today.toISOString())`)이 아니라 **`date` 컬럼 기준** `.eq('date', todayKst)`로 바꾼다(기록 date는 저장 시 KST 문자열).
  - `weeklyCount`는 이번 주 기록들의 `date` 배열에 `countWeekEntries(dates, todayKst)`를 적용해 계산.
- [ ] **Step 2: 반환 타입 갱신** — `DashboardData`(또는 해당 반환 타입)에 `todayKst: string; weeklyCount: number;` 추가. `app/protected/dashboard/page.tsx`에서 타입 에러가 나지 않는지 `npx tsc --noEmit`으로 확인(다음 태스크에서 props로 소비).
- [ ] **Step 3: 검증** — `npx tsc --noEmit` + `npx vitest run` + `npm run build` 통과.
- [ ] **Step 4: 커밋** — `🐛 fix(dashboard): 스트릭·주간 판정을 KST 기준으로 통일하고 주간 문장 수 반환`

---

### Task 3: `WeeklyStreakSection` 순화 — "이번 주 문장 N개"

**Files:**
- Modify: `app/protected/dashboard/_components/WeeklyStreakSection.tsx`
- Modify: `app/protected/dashboard/page.tsx` (새 props 전달)

**Interfaces:**
- Consumes: Task 2의 `todayKst`/`weeklyCount`/`streak`/`weekActivity`/`entry`, Task 1의 `weekDatesKST`.
- Produces: `WeeklyStreakSection` props가 `{ weeklyCount: number; streak: number; weekActivity: boolean[]; todayKst: string; entry: Entry | null }`로 변경.

- [ ] **Step 1: 클라이언트 날짜 판정 제거** — `useState(new Date())`/`useEffect`/`mounted` 가드 전부 삭제. 요일 도트는 `weekDatesKST(todayKst)`로 7개 날짜를 얻어 `d === todayKst`(오늘)·`d < todayKst`(과거, 문자열 비교로 충분) 판정. 요일 라벨은 `format(parseISO(d), 'EE', { locale: ko })[0]` 유지.
- [ ] **Step 2: 카피 순화** —
  - 섹션 제목 `📅 이번 주의 리듬` → 이모지 제거하고 `이번 주의 리듬` 유지(산세리프 섹션 타이틀).
  - 헤드라인(제목 아래)에 serif 강조: `<p className="font-serif text-xl text-ink">이번 주 문장 <span className="text-accent">{weeklyCount}</span>개</p>`. weeklyCount가 0이면 `아직 이번 주의 첫 문장이 없어요`.
  - 기존 `🔥 현재 {streak}일 연속 기록 중!` 강조 문구 삭제. 대신 `streak >= 2`일 때만 보조 텍스트로 `<p className="text-sm text-ink-muted">{streak}일째 이어지고 있어요</p>` (강조 아님, 이모지 없음).
  - 도트의 `✓` 문자 유지 여부는 구현 재량이되 이모지·원색 금지 규칙 준수(현행 `✓`는 텍스트라 허용).
  - 하단 "오늘 읽은 책"(entry) 블록은 유지하되 장식 이모지가 있으면 제거.
- [ ] **Step 3: page.tsx에서 새 props 전달** — `todayKst`·`weeklyCount` 내려주기.
- [ ] **Step 4: 검증** — `npx tsc --noEmit` + `npm run build`. `npm run dev` 실행 후 로그인 없이 접근 가능한 화면이 아니므로 코드 리뷰로 갈음(프로덕션 로그인 금지).
- [ ] **Step 5: 커밋** — `✨ feat(dashboard): 주간 리듬 순화 — "이번 주 문장 N개" 중심, KST 도트`

---

### Task 4: `InProgressBooksSection` 진행률 정리 + 데드 코드 삭제

**Files:**
- Modify: `app/protected/dashboard/_components/InProgressBooksSection.tsx`
- Modify: `lib/dashboard/fetchDashboardData.ts` (MyBook 매핑의 `progress: b.progress ?? 0` 제거)
- Delete: `app/protected/dashboard/_components/StatsSection.tsx`
- Delete: `app/protected/dashboard/_components/TodaySummarySection.tsx`

**Interfaces:**
- Consumes: `MyBook` 타입(이 파일들에서 사용하는 형태).
- Produces: `MyBook.progress`가 `number | null`이 되고, null이면 진행바·퍼센트를 렌더하지 않는다.

- [ ] **Step 1: null 보존** — `fetchDashboardData.ts`의 myBooks 매핑에서 `progress: b.progress ?? 0` → `progress: b.progress`(null 보존). `MyBook` 타입의 `progress`를 `number | null`로.
- [ ] **Step 2: 표시 분기** — `InProgressBooksSection.tsx`의 `SingleBookCard`/`MultiBookCard` 각각에서 책 상세(`components/books/BookDetailContent.tsx:102-115`)와 같은 패턴으로 분기:
  - `progress != null`(= total_pages 있음): 기존 진행바 + `{progress}%` 유지.
  - `progress == null`: 진행바·퍼센트 미표시. `last_read_page`가 있으면 `<span className="text-xs text-ink-muted">{last_read_page}쪽까지 읽음</span>`, 없으면 `<span className="text-xs text-ink-faint">페이지 기록 없음</span>`.
  - 섹션 제목의 `📚` 등 장식 이모지 제거.
- [ ] **Step 3: 데드 코드 삭제** — `StatsSection.tsx`·`TodaySummarySection.tsx` 삭제 전 `grep -rn "StatsSection\|TodaySummarySection" app components lib`로 참조 0건 재확인 후 삭제.
- [ ] **Step 4: 검증** — `npx tsc --noEmit` + `npm run build` + `npx vitest run`.
- [ ] **Step 5: 커밋** — `🐛 fix(dashboard): 페이지 정보 없는 책의 0% 오표시 제거·데드 섹션 삭제`

---

### Task 5: 회상 카드 + 홈 재구성 (피드 프리뷰 제거)

**Files:**
- Create: `lib/recall/selectRecall.ts` (순수 선택 로직)
- Create: `lib/recall/fetchRecallEntry.ts` (서버 페칭)
- Test: `lib/recall/__tests__/selectRecall.test.ts`
- Create: `app/protected/dashboard/_components/RecallCard.tsx`
- Modify: `app/protected/dashboard/page.tsx` (섹션 순서 재배치·SocialFeed 제거)
- Delete: `app/protected/dashboard/_components/SocialFeed.tsx`
- Delete: `app/protected/dashboard/_components/SocialFeedItem.tsx` (대시보드 밖 참조가 없을 때만)

**Interfaces:**
- Consumes: `lib/dates.ts`의 `todayKST()`, `createSupabaseServerClient` 서버 함수 패턴(`lib/queries/fetchSocialFeedEntries.ts` 참고), `components/ui`의 `Card`/`Seal`.
- Produces:
  - `selectRecall(candidates: RecallCandidate[], todayKst: string, seedKey: string): RecallCandidate | null` — 같은 월-일 우선, 없으면 시드 기반 무작위.
  - `fetchRecallEntry(): Promise<RecallEntry | null>` — null이면 홈에서 카드 미렌더(신규 사용자 숨김).
  - `RecallEntry = { id: string; date: string; quote: string | null; note: string | null; bookTitle: string; yearsAgo: number | null }` (`yearsAgo`는 같은 월-일 매치일 때만 연차, 아니면 null).

- [ ] **Step 1: 실패하는 테스트 작성** — `lib/recall/__tests__/selectRecall.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { selectRecall, type RecallCandidate } from '../selectRecall';

const c = (id: string, date: string): RecallCandidate => ({ id, date });

describe('selectRecall', () => {
  it('같은 월-일의 과거 기록을 최우선, 여러 해면 가장 오래된 것', () => {
    const picked = selectRecall(
      [c('a', '2024-08-27'), c('b', '2025-08-27'), c('d', '2025-01-01')],
      '2026-08-27',
      'seed',
    );
    expect(picked?.id).toBe('a');
  });
  it('같은 월-일이 없으면 30일 이상 지난 기록 중에서 시드 결정적으로 고른다', () => {
    const cands = [c('a', '2026-06-01'), c('b', '2026-05-01'), c('e', '2026-08-20')];
    const p1 = selectRecall(cands, '2026-08-27', 'user1|2026-08-27');
    const p2 = selectRecall(cands, '2026-08-27', 'user1|2026-08-27');
    expect(p1?.id).toBe(p2?.id);           // 같은 날·같은 사용자 = 같은 카드
    expect(['a', 'b']).toContain(p1?.id);  // 30일 이내 기록('e')은 후보 제외
  });
  it('30일 이상 지난 기록이 하나도 없으면 null (신규 사용자 숨김)', () => {
    expect(selectRecall([c('e', '2026-08-20')], '2026-08-27', 's')).toBeNull();
  });
  it('빈 배열이면 null', () => {
    expect(selectRecall([], '2026-08-27', 's')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run lib/recall` → FAIL.

- [ ] **Step 3: 순수 로직 구현** — `lib/recall/selectRecall.ts`

```ts
import { format, parseISO, subDays } from 'date-fns';

export interface RecallCandidate {
  id: string;
  date: string; // yyyy-MM-dd
}

/**
 * 회상 카드 선택 규칙 (스펙 §5):
 * 1) 같은 월-일의 과거 기록 우선 — 여러 해가 있으면 가장 오래된 해.
 * 2) 없으면 30일 이상 지난 기록 중 시드 기반 결정적 무작위(같은 날엔 같은 카드).
 * 3) 그것도 없으면 null — 기록이 적은 신규 사용자에게는 카드를 숨긴다.
 */
export function selectRecall(
  candidates: RecallCandidate[],
  todayKst: string,
  seedKey: string,
): RecallCandidate | null {
  const monthDay = todayKst.slice(5); // 'MM-dd'
  const sameDay = candidates
    .filter((c) => c.date < todayKst && c.date.slice(5) === monthDay)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sameDay.length > 0) return sameDay[0];

  const cutoff = format(subDays(parseISO(todayKst), 30), 'yyyy-MM-dd');
  const old = candidates.filter((c) => c.date <= cutoff);
  if (old.length === 0) return null;

  let seed = 0;
  for (const ch of seedKey) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return old[seed % old.length];
}
```

- [ ] **Step 4: 테스트 통과 확인** — `npx vitest run lib/recall` → PASS.

- [ ] **Step 5: 서버 페칭** — `lib/recall/fetchRecallEntry.ts`. 패턴은 `fetchDashboardData.ts`와 동일(서버 전용, RLS 하 본인 데이터):
  1. 로그인 사용자 확인 → 본인 `user_books` id 목록(`id, books(title)` 셀렉트).
  2. `entries.in('user_book_id', ids).lt('date', todayKst).select('id, date, quote, note, user_book_id')` — 비공개 포함(본인 전용 카드).
  3. `selectRecall(rows, todayKst, \`${user.id}|${todayKst}\`)`로 선택, 선택된 행에서 `RecallEntry` 조립. `yearsAgo`는 `date.slice(5) === todayKst.slice(5)`일 때 `연도 차이`, 아니면 null.
  4. 실패·미로그인·후보 없음은 전부 `null` 반환(홈이 조용히 숨김).

- [ ] **Step 6: RecallCard 컴포넌트** — `app/protected/dashboard/_components/RecallCard.tsx` (서버 컴포넌트로 충분 — 상호작용은 링크뿐):

```tsx
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';

export function RecallCard({ recall }: { recall: RecallEntry }) {
  const label =
    recall.yearsAgo != null ? `${recall.yearsAgo}년 전 오늘` : '다시 꺼낸 기록';
  const body = recall.quote ?? recall.note ?? '';
  return (
    <Link href={`/protected/entry/${recall.id}`} className="block">
      <Card hoverable className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <Seal>{label}</Seal>
          <span className="text-xs text-ink-faint">{recall.date}</span>
        </div>
        <p className={`font-serif text-ink line-clamp-3 ${recall.quote ? 'text-quote' : ''}`}>
          {recall.quote ? `“${body}”` : body}
        </p>
        <p className="mt-3 text-sm text-ink-muted">『{recall.bookTitle}』</p>
      </Card>
    </Link>
  );
}
```

  (quote가 있으면 인용 스타일, 없으면 note를 일반 serif로. `line-clamp` 유틸이 프로젝트에 없으면 `overflow-hidden` + `max-h`로 3줄 상당 제한.)

- [ ] **Step 7: 홈 재구성** — `app/protected/dashboard/page.tsx`:
  - `Promise.all`에 `fetchRecallEntry()` 추가, `fetchSocialFeedEntries(...)` 호출·import 제거.
  - 렌더 순서: `GreetingHeader` → `Composer` → (`recall && <RecallCard …/>`) → `WeeklyStreakSection` → `InProgressBooksSection`/`NoBooksSection`. `SocialFeed` 렌더 제거.
  - `SocialFeed.tsx`·`SocialFeedItem.tsx`는 `grep -rn "SocialFeed\b\|SocialFeedItem" app components lib`으로 대시보드 밖 참조가 없음을 확인한 뒤 삭제(밖에서 쓰이면 삭제하지 말고 보고).
- [ ] **Step 8: 검증** — `npx tsc --noEmit` + `npx vitest run` + `npm run build`.
- [ ] **Step 9: 커밋** — `✨ feat(dashboard): 회상 카드 추가·홈 섹션 재배치·피드 프리뷰 제거`

---

### Task 6: 월말 회고 카드

**Files:**
- Create: `lib/retrospect/monthlyRecap.ts` (순수 판정·범위 계산)
- Create: `lib/retrospect/fetchMonthlyRecap.ts` (서버 페칭)
- Test: `lib/retrospect/__tests__/monthlyRecap.test.ts`
- Create: `app/protected/dashboard/_components/MonthlyRecapCard.tsx`
- Modify: `app/protected/dashboard/page.tsx`

**Interfaces:**
- Consumes: `todayKST()`, 서버 함수 패턴, `Card`/`Seal`.
- Produces:
  - `isMonthlyRecapDay(todayKst: string): boolean` — KST로 매월 1일인가.
  - `prevMonthRange(todayKst: string): { start: string; end: string; label: string }` — 지난달 1일~말일과 라벨(예: `2026년 7월`).
  - `fetchMonthlyRecap(): Promise<MonthlyRecap | null>` — `MonthlyRecap = { label: string; entryCount: number; quoteCount: number; bookCount: number }`, 지난달 기록 0건이거나 오늘이 1일이 아니면 null.

- [ ] **Step 1: 실패하는 테스트 작성** — `lib/retrospect/__tests__/monthlyRecap.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { isMonthlyRecapDay, prevMonthRange } from '../monthlyRecap';

describe('isMonthlyRecapDay', () => {
  it('매월 1일만 true', () => {
    expect(isMonthlyRecapDay('2026-09-01')).toBe(true);
    expect(isMonthlyRecapDay('2026-08-27')).toBe(false);
  });
});

describe('prevMonthRange', () => {
  it('지난달 1일~말일과 라벨', () => {
    expect(prevMonthRange('2026-09-01')).toEqual({
      start: '2026-08-01', end: '2026-08-31', label: '2026년 8월',
    });
  });
  it('연 경계 — 1월 1일이면 지난해 12월', () => {
    expect(prevMonthRange('2026-01-01')).toEqual({
      start: '2025-12-01', end: '2025-12-31', label: '2025년 12월',
    });
  });
  it('말일이 짧은 달 — 3월 1일이면 2월 28일까지', () => {
    expect(prevMonthRange('2026-03-01').end).toBe('2026-02-28');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run lib/retrospect` → FAIL.
- [ ] **Step 3: 구현** — `lib/retrospect/monthlyRecap.ts`: `parseISO` + date-fns `subMonths`/`startOfMonth`/`endOfMonth`/`format` 조합. `isMonthlyRecapDay`는 `todayKst.endsWith('-01')`로 충분.
- [ ] **Step 4: 테스트 통과 확인** — PASS 후 전체 `npx vitest run`.
- [ ] **Step 5: 서버 페칭** — `lib/retrospect/fetchMonthlyRecap.ts`:
  1. `todayKST()`가 1일이 아니면 즉시 null.
  2. 본인 `user_books` id 목록 → `entries.in('user_book_id', ids).gte('date', start).lte('date', end).select('id, quote, user_book_id')`.
  3. `entryCount = rows.length`, `quoteCount = quote가 실질 내용인 행 수`, `bookCount = new Set(user_book_id).size`. `entryCount === 0`이면 null.
- [ ] **Step 6: 카드 + 배치** — `MonthlyRecapCard.tsx` (서버 컴포넌트):
  - `Seal`로 `지난달의 기록`, 헤드라인 serif: quoteCount > 0이면 `{label}, 문장 {quoteCount}개를 남겼어요`, 아니면 `{label}, 기록 {entryCount}개를 남겼어요`.
  - 보조 줄: `기록 {entryCount}개 · 책 {bookCount}권` (`text-sm text-ink-muted`).
  - `page.tsx`에서 `fetchMonthlyRecap()`을 `Promise.all`에 추가하고 **GreetingHeader 아래·Composer 위**에 `recap && <MonthlyRecapCard …/>` 렌더(스펙: "매월 1일 홈 상단").
- [ ] **Step 7: 검증** — `npx tsc --noEmit` + `npx vitest run` + `npm run build`.
- [ ] **Step 8: 커밋** — `✨ feat(dashboard): 매월 1일 지난달 회고 카드`

---

### Task 7: 발췌집 뷰 + 책 상세 진입점

**Files:**
- Create: `app/protected/books/[book_id]/excerpts/page.tsx`
- Create: `components/books/ExcerptReader.tsx`
- Modify: `components/books/BookDetailContent.tsx` (완독 카드에 진입점)

**Interfaces:**
- Consumes: `lib/books/fetchBookDetail.ts`(기존 서버 함수 — 책·entries 일괄 로드), `Seal`/`Card`/`BackButton`, `Entry` 타입.
- Produces: 라우트 `/protected/books/[book_id]/excerpts`. `ExcerptReader` props: `{ bookTitle: string; author: string | null; quotes: { id: string; date: string; quote: string }[]; lastDate: string | null }`.

- [ ] **Step 1: 라우트 페이지** — `app/protected/books/[book_id]/excerpts/page.tsx` (서버 컴포넌트):
  1. `fetchBookDetail(book_id)`로 로드(기존 시그니처 그대로 재사용 — 본인 소유가 아니거나 없으면 기존 페이지와 같은 방식으로 `notFound()`/redirect).
  2. `is_finished`가 아니면 `redirect(\`/protected/books/${book_id}\`)` — 발췌집은 완독 책의 특별 뷰다(스펙 §5).
  3. `entries`에서 `quote`가 실질 내용인 것만 골라 `date` 오름차순(같은 날은 `created_at` 오름차순) 정렬 → `ExcerptReader`에 전달. `lastDate`는 전체 entries의 최신 `date`(완독일 대체 표기 — Global Constraints 참고).
- [ ] **Step 2: 리더 뷰** — `components/books/ExcerptReader.tsx`:
  - **표지부**: 중앙 정렬. `Seal`로 `발췌집`, `<h1 className="font-serif text-2xl text-ink">{bookTitle}</h1>`, 저자(`text-ink-muted`), 하단에 `문장 {quotes.length}개 · 마지막 문장 {lastDate}` (`text-seal` 톤의 작은 라벨). 헤어라인(`border-b border-hairline`)으로 본문과 구분.
  - **리더부**: quotes를 세로로. 각 항목은 `<blockquote className="font-serif text-quote text-ink">“{quote}”</blockquote>` + 아래 작은 날짜 라벨(`text-xs text-ink-faint`). 항목 사이는 헤어라인이 아니라 넉넉한 여백(`space-y-10` 수준)으로 — 책을 읽듯 이어지게. 카드 박스로 감싸지 않는다(리더 뷰는 종이 바탕 위에 직접).
  - quotes가 0개면: `옮겨 적은 문장이 없어요. 기록의 생각들은 책 상세에서 다시 볼 수 있어요.` 빈 상태(`text-ink-muted`, 중앙).
  - 상단에 `BackButton`(책 상세로).
- [ ] **Step 3: 진입점** — `BookDetailContent.tsx`의 완독 카드("완독한 도서입니다", 128-159행 부근)에 `발췌집 보기` 링크 버튼 추가: `<Link href={\`/protected/books/${bookId}/excerpts\`}>` + `Button variant="secondary"`. quote 유무와 무관하게 완독이면 노출(빈 상태는 발췌집 페이지가 처리).
- [ ] **Step 4: 검증** — `npx tsc --noEmit` + `npm run build`. 라우트가 빌드 산출물에 나타나는지 확인.
- [ ] **Step 5: 커밋** — `✨ feat(books): 발췌집 뷰 — 완독 책의 문장 모음 리더`

---

### Task 8: 프로필 회고 섹션 (발췌집 목록 + 월별 요약)

**Files:**
- Create: `lib/profile/fetchRetrospectData.ts`
- Test: `lib/profile/__tests__/monthlySummary.test.ts` (순수 집계 함수)
- Create: `components/profile/ProfileRetrospect.tsx`
- Modify: `app/protected/profile/page.tsx`

**Interfaces:**
- Consumes: `todayKST()`, 서버 함수 패턴, `Card`/`Seal`.
- Produces:
  - `summarizeByMonth(entryDates: string[], todayKst: string, months: number): { label: string; count: number }[]` — 최근 `months`개월(이번 달 포함, 최신순)의 월별 기록 수. `lib/profile/fetchRetrospectData.ts`에서 export하는 순수 함수.
  - `fetchRetrospectData(userId: string): Promise<{ finishedBooks: { bookId: string; title: string; quoteCount: number }[]; monthly: { label: string; count: number }[] }>`

- [ ] **Step 1: 실패하는 테스트 작성** — `lib/profile/__tests__/monthlySummary.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { summarizeByMonth } from '../fetchRetrospectData';

describe('summarizeByMonth', () => {
  it('최근 N개월을 최신순으로, 기록 없는 달은 0', () => {
    const dates = ['2026-08-27', '2026-08-01', '2026-06-15'];
    expect(summarizeByMonth(dates, '2026-08-27', 3)).toEqual([
      { label: '2026년 8월', count: 2 },
      { label: '2026년 7월', count: 0 },
      { label: '2026년 6월', count: 1 },
    ]);
  });
  it('연 경계를 넘어간다', () => {
    const rows = summarizeByMonth(['2025-12-31'], '2026-01-15', 2);
    expect(rows).toEqual([
      { label: '2026년 1월', count: 0 },
      { label: '2025년 12월', count: 1 },
    ]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인 → 구현 → 통과** — `summarizeByMonth`는 `date.slice(0, 7)`(yyyy-MM) 키로 집계, 라벨은 `\`${y}년 ${Number(m)}월\``. 파일 상단이 서버 전용 import(`createSupabaseServerClient`)와 섞이면 vitest(node)에서 import가 깨질 수 있으니, **순수 함수는 서버 클라이언트 import보다 위에 두고 서버 의존은 `fetchRetrospectData` 함수 안에서 동적 import**하거나, 순수 함수를 같은 디렉터리 `monthlySummary.ts`로 분리해도 된다(분리 시 테스트 경로도 맞출 것 — 리뷰에서 어느 쪽이든 허용).
- [ ] **Step 3: 서버 페칭** — `fetchRetrospectData(userId)`:
  1. `user_books.eq('user_id', userId).eq('is_finished', true).select('id, book_id, books(title)')` → 완독 목록.
  2. 본인 전체 entries `select('date, quote, user_book_id')` (user_books id 목록 in 필터) 1회 조회로 월별 집계(`summarizeByMonth(dates, todayKST(), 6)`)와 완독 책별 `quoteCount`(quote 실질 내용 행 수)를 함께 계산.
- [ ] **Step 4: 섹션 컴포넌트** — `components/profile/ProfileRetrospect.tsx` (서버 컴포넌트):
  - 섹션 제목 `회고` (기존 프로필 섹션 타이틀 스타일 준수, 이모지 없음).
  - **발췌집 목록**: 완독 책마다 `<Link href={\`/protected/books/${bookId}/excerpts\`}>` 행 — serif 책 제목 + `문장 {quoteCount}개` 라벨, 행 사이 헤어라인. 완독 책 0권이면 `완독을 선언하면 그 책의 발췌집이 여기에 쌓여요.` 안내(`text-ink-muted`).
  - **월별 요약**: 최근 6개월 리스트 — `{label}` + `기록 {count}개`, count 0인 달은 `text-ink-faint`. 전부 0이면 월별 블록 자체를 숨긴다.
- [ ] **Step 5: 배치** — `app/protected/profile/page.tsx`에서 `ProfileStats` 아래에 **본인 프로필일 때만** 렌더(비공개 기록 포함 데이터이므로 타인 프로필 금지 — 이 페이지는 본인 전용 라우트지만, `isOwnProfile` 개념이 있는 공용 컴포넌트를 쓰게 되면 반드시 가드).
- [ ] **Step 6: 검증** — `npx tsc --noEmit` + `npx vitest run` + `npm run build`.
- [ ] **Step 7: 커밋** — `✨ feat(profile): 회고 섹션 — 발췌집 목록·월별 기록 요약`

---

## Self-Review 결과 (플랜 작성 시 수행)

- 스펙 §5 홈 구조(입력창→회상→주간 리듬→읽는 책, 피드 프리뷰 제거) → Task 5·3·4. 회상 카드 규칙(같은 월-일 우선·무작위 폴백·신규 숨김) → Task 5. 발췌집(표지+리더, quote 우선·시간순) → Task 7. 월말 회고(매월 1일 홈 상단) → Task 6. 프로필 회고(발췌집 목록·월별 요약) → Task 8. 스트릭 KST + "이번 주 문장 N개" → Task 1·2·3. §9 중 이 플랜 몫(데드 코드 2종) → Task 4.
- 완독일 컬럼 부재 → "마지막 기록 날짜" 대체는 Global Constraints에 확정 기록.
- 타입 일관성: `todayKst`/`weeklyCount`(Task 2 산출 = Task 3 소비), `RecallEntry`(Task 5 내부), `MonthlyRecap`(Task 6 내부), `summarizeByMonth`(Task 8) 서로 독립 — 교차 참조 없음.
