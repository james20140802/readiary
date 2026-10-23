'use client';

import { Suspense, use, useSyncExternalStore } from 'react';
import clsx from 'clsx';
import { Leaf, Leaves } from '@/components/shell/Leaves';
import { useReflectionFeature } from '@/components/features/ReflectionFeatureProvider';
import type { RecentEntry } from '@/lib/dashboard/fetchRecentEntries';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';
import type { MyBook } from '@/types/book';
import TodayDate from './TodayDate';
import RecallSlip from './RecallSlip';
import WeekDiary from './WeekDiary';
import ReadingBooks from './ReadingBooks';
import s from './today.module.css';

export interface TodayViewProps {
  todayKst: string;
  weeklyCount: number;
  weekActivity: boolean[];
  books: MyBook[];
  latestTexts: Record<string, string>;
  recentUserBookId: string | null;
  recentEntries: RecentEntry[];
  /** 회상은 따로 늦게 올 수 있다 — 도착하면 간지가 나타난다 */
  recall: Promise<RecallEntry | null>;
  /** 쓰기는 한 번에 하나만 마운트한다(초안 상태가 둘로 갈라지지 않게). 폭에 맞는 쪽을 고른다 */
  composerMobile: React.ReactNode;
  composerDesk: React.ReactNode;
  /** 견본에서는 회상 알림 읽음 처리를 끈다 */
  markSeen?: boolean;
}

const DESK_QUERY = '(min-width: 1024px)';
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
/** 서버와 첫 하이드레이션에서는 null — 두 배치를 CSS로만 가리고, 그 뒤 한쪽만 남긴다 */
function useIsDesktop(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESK_QUERY).matches,
    () => null
  );
}

function Recall({
  recall,
  todayKst,
  desk,
  markSeen,
}: {
  recall: Promise<RecallEntry | null>;
  todayKst: string;
  desk?: boolean;
  markSeen: boolean;
}) {
  const entry = use(recall);
  const reflect = useReflectionFeature();
  if (!entry) return null;
  return (
    <RecallSlip
      recall={entry}
      todayKst={todayKst}
      reflect={reflect}
      desk={desk}
      markSeen={markSeen}
    />
  );
}

export const COMPOSER_TEXT_ID = { mobile: 'today-composer-text', desk: 'today-desk-composer-text' };

/**
 * 오늘 — 시안 home2. 모바일은 한 번에 한 장(오늘 쓰기 → 지난 7일 → 읽던 책),
 * 데스크톱은 펼친 일기장 두 쪽 한 화면(왼쪽 쓰기·읽던 책, 오른쪽 회상 간지·지난 7일).
 */
export default function TodayView(p: TodayViewProps) {
  const desk = useIsDesktop();
  const markSeen = p.markSeen ?? true;

  return (
    <>
      <h1 className="sr-only">오늘</h1>

      {desk !== true && (
        <Leaves>
          <Leaf title="오늘" label="오늘 쓰기">
            <div className={s.leafBody}>
              <TodayDate todayKst={p.todayKst} weeklyCount={p.weeklyCount} />
              {p.composerMobile}
              <Suspense fallback={null}>
                <Recall recall={p.recall} todayKst={p.todayKst} markSeen={markSeen} />
              </Suspense>
            </div>
          </Leaf>
          <Leaf title="지난 7일" label="지난 7일의 일기" vellum>
            <WeekDiary
              recentEntries={p.recentEntries}
              todayKst={p.todayKst}
              weeklyCount={p.weeklyCount}
              weekActivity={p.weekActivity}
              composerId={COMPOSER_TEXT_ID.mobile}
            />
          </Leaf>
          <Leaf title="읽던 책" vellum>
            <h2 className="font-serif text-section-title text-ink">읽던 책</h2>
            <ReadingBooks
              books={p.books}
              currentId={p.recentUserBookId}
              latestTexts={p.latestTexts}
            />
          </Leaf>
        </Leaves>
      )}

      {desk !== false && (
        <div className={clsx('hidden lg:grid', s.spread)}>
          <div className="min-w-0">
            <TodayDate todayKst={p.todayKst} weeklyCount={p.weeklyCount} desk />
            {p.composerDesk}
            <ReadingBooks
              books={p.books}
              currentId={p.recentUserBookId}
              latestTexts={p.latestTexts}
              desk
            />
          </div>
          <div className={s.right}>
            <Suspense fallback={null}>
              <Recall recall={p.recall} todayKst={p.todayKst} desk markSeen={markSeen} />
            </Suspense>
            <section aria-label="지난 7일의 일기" className={clsx('vellum first:mt-0', s.week)}>
              <WeekDiary
                recentEntries={p.recentEntries}
                todayKst={p.todayKst}
                weeklyCount={p.weeklyCount}
                weekActivity={p.weekActivity}
                composerId={COMPOSER_TEXT_ID.desk}
                desk
              />
            </section>
          </div>
        </div>
      )}
    </>
  );
}
