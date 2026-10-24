/**
 * 오늘 화면(시안 home2)을 견본 데이터로 확인하는 미리보기 전용 화면. 데이터를 가져오지 않고 아무것도 저장하지 않는다.
 * 상태는 ?s= 로 고른다: default · quiet(지난 7일 기록 없음) · new(첫 방문, 책 없음) · saved(남긴 뒤) ·
 * pending(저장 결과 확인 필요) · loading · error
 * 이 화면은 `redesign` → `main` 머지(설계 6절 9) 전에 지운다. 프로덕션 배포에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import TodayLab, { type LabState } from './TodayLab';
import { BOOKS, LATEST, QUIET, RECALL, RECENT, TODAY } from './fixtures';

export const metadata: Metadata = { title: '오늘 견본', robots: { index: false } };

const STATES: LabState[] = ['default', 'quiet', 'new', 'saved', 'pending', 'loading', 'error'];

export default async function TodayLabPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { s } = await searchParams;
  const state = (STATES as string[]).includes(s ?? '') ? (s as LabState) : 'default';

  const fresh = state === 'new';
  const books = fresh ? [] : BOOKS;
  const recent = fresh ? [] : state === 'quiet' ? QUIET : RECENT;
  const weeklyCount = fresh || state === 'quiet' ? 0 : 4;
  const weekActivity =
    fresh || state === 'quiet'
      ? [false, false, false, false, false, false, false]
      : [false, false, true, false, true, false, true];

  return (
    <TodayLab
      state={state}
      view={{
        todayKst: TODAY,
        weeklyCount,
        weekActivity,
        books,
        latestTexts: fresh ? {} : LATEST,
        recentUserBookId: fresh ? null : BOOKS[0].id,
        recentEntries: recent,
        recall: Promise.resolve(fresh ? null : RECALL),
      }}
      composer={{
        books,
        saved:
          state === 'saved'
            ? { id: 'e1', mode: 'quote', text: RECENT[0].quote!, bookTitle: BOOKS[0].books.title }
            : null,
        pending: state === 'pending',
        initial:
          state === 'pending'
            ? { quote: '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.' }
            : undefined,
        saveError:
          state === 'pending'
            ? '응답을 받지 못했어요. 기록이 이미 남겨졌을 수 있으니 저장 확인·재시도를 눌러 주세요.'
            : null,
      }}
    />
  );
}
