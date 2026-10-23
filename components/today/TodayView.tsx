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
import { TodayDesktopContext } from './TodayDesktopContext';

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
  /** 화면 폭이 바뀌어도 같은 작성기 인스턴스를 유지한다 */
  composer: React.ReactNode;
  /** 견본에서는 회상 알림 읽음 처리를 끈다 */
  markSeen?: boolean;
}

const DESK_QUERY = '(min-width: 1024px)';
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
/** 서버와 첫 하이드레이션에서는 null. 이후 배치용 props만 바꾸고 작성기는 유지한다. */
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
    <TodayDesktopContext.Provider value={desk === true}>
      <h1 className="sr-only">오늘</h1>
      <Leaves desktop className={s.responsiveSpread}>
        <Leaf title="오늘" label="오늘 쓰기">
          <div className={s.leafBody}>
            <TodayDate todayKst={p.todayKst} weeklyCount={p.weeklyCount} desk={desk === true} />
            {p.composer}
            <div className="lg:hidden">
              <Suspense fallback={null}>
                <Recall recall={p.recall} todayKst={p.todayKst} markSeen={markSeen} />
              </Suspense>
            </div>
            <div className="hidden lg:block">
              <ReadingBooks
                books={p.books}
                currentId={p.recentUserBookId}
                latestTexts={p.latestTexts}
                desk
              />
            </div>
          </div>
        </Leaf>
        <Leaf title="지난 7일" label="지난 7일의 일기" vellum={desk !== true}>
          <div className={s.right}>
            <div className="hidden lg:block">
              <Suspense fallback={null}>
                <Recall recall={p.recall} todayKst={p.todayKst} desk markSeen={markSeen} />
              </Suspense>
            </div>
            <section
              aria-label="지난 7일의 일기"
              className={clsx(desk && 'vellum', desk && s.week)}
            >
              <WeekDiary
                recentEntries={p.recentEntries}
                todayKst={p.todayKst}
                weeklyCount={p.weeklyCount}
                weekActivity={p.weekActivity}
                composerId={desk ? COMPOSER_TEXT_ID.desk : COMPOSER_TEXT_ID.mobile}
                desk={desk === true}
              />
            </section>
          </div>
        </Leaf>
        <div className="lg:hidden">
          <Leaf title="읽던 책" vellum>
            <h2 className="font-serif text-section-title text-ink">읽던 책</h2>
            <ReadingBooks
              books={p.books}
              currentId={p.recentUserBookId}
              latestTexts={p.latestTexts}
            />
          </Leaf>
        </div>
      </Leaves>
    </TodayDesktopContext.Provider>
  );
}
