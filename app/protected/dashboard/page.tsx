import { Suspense } from 'react';
import Composer from './_components/Composer';
import { InProgressBooksStack } from './_components/InProgressBooksStack';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import GreetingHeader from './_components/GreetingHeader';
import {
  BoardWidget,
  RecallWidget,
  RecapWidget,
  StatsWidget,
} from './_components/DashboardWidgets';
import { fetchDashboardData } from '@/lib/dashboard/fetchDashboardData';
import { fetchRecallEntry } from '@/lib/recall/fetchRecallEntry';
import { fetchMonthlyRecap } from '@/lib/retrospect/fetchMonthlyRecap';
import { fetchDetailSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { getUserStats } from '@/lib/stats/getUserStats';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { redirect } from 'next/navigation';
import { inkIn } from '@/lib/motion';

function WidgetSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      role="status"
      aria-label="독서 정보를 불러오는 중입니다"
      className={(tall ? 'h-64' : 'h-28') + ' rounded-2xl bg-hairline/60 motion-safe:animate-pulse'}
    />
  );
}

export default async function DashboardPage() {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) redirect('/login');

  // Start independent requests together, but only core data gates the composer.
  const core = fetchDashboardData();
  const recall = fetchRecallEntry();
  const recap = fetchMonthlyRecap();
  const friendFeed = fetchDetailSocialFeedEntries(0, 6).catch(() => null);
  const stats = getUserStats(user.id);
  const data = await core;
  const {
    books,
    name,
    weekActivity,
    recentUserBookId,
    todayKst,
    weeklyCount,
    latestTexts,
    recentEntries,
  } = data;

  // 차례 등장 — 위에서부터 한 덩이씩. 늦게 오는 위젯(Suspense)은 도착할 때 나타나고,
  // 위젯이 아무것도 그리지 않으면 빈 상자가 간격을 차지하지 않게 감춘다.
  const step = 'ink-in empty:hidden';
  return (
    <div className="w-full">
      <div className="ink-in" style={inkIn(0)}>
        <GreetingHeader name={name} />
      </div>
      <section className="space-y-8">
        <Suspense fallback={null}>
          <div className={step} style={inkIn(1)}>
            <RecapWidget result={recap} />
          </div>
        </Suspense>
        <div className="ink-in" style={inkIn(1)}>
          <Composer
            key={user.id}
            userId={user.id}
            books={books}
            recentUserBookId={recentUserBookId}
          />
        </div>
        <Suspense fallback={<WidgetSkeleton />}>
          <div className={step} style={inkIn(2)}>
            <RecallWidget result={recall} />
          </div>
        </Suspense>
        <div className="ink-in" style={inkIn(3)}>
          <WeeklyStreakSection
            weeklyCount={weeklyCount}
            weekActivity={weekActivity}
            todayKst={todayKst}
          />
        </div>
        <div className="ink-in" style={inkIn(4)}>
          {books.length > 0 ? (
            <InProgressBooksStack
              myBooks={books}
              initialTopId={recentUserBookId ?? books[0].id}
              latestTexts={latestTexts}
            />
          ) : (
            <NoBooksSection />
          )}
        </div>
        <Suspense fallback={<WidgetSkeleton tall />}>
          <div className={step} style={inkIn(5)}>
            <BoardWidget
              result={friendFeed}
              recentEntries={recentEntries}
              userId={user.id}
              todayKst={todayKst}
            />
          </div>
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <div className={step} style={inkIn(5)}>
            <StatsWidget result={stats} name={name} />
          </div>
        </Suspense>
      </section>
    </div>
  );
}
