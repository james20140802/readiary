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

  return (
    <div className="w-full">
      <GreetingHeader name={name} />
      <section className="space-y-8">
        <Suspense fallback={null}>
          <RecapWidget result={recap} />
        </Suspense>
        <Composer
          key={user.id}
          userId={user.id}
          books={books}
          recentUserBookId={recentUserBookId}
        />
        <Suspense fallback={<WidgetSkeleton />}>
          <RecallWidget result={recall} />
        </Suspense>
        <WeeklyStreakSection
          weeklyCount={weeklyCount}
          weekActivity={weekActivity}
          todayKst={todayKst}
        />
        {books.length > 0 ? (
          <InProgressBooksStack
            myBooks={books}
            initialTopId={recentUserBookId ?? books[0].id}
            latestTexts={latestTexts}
          />
        ) : (
          <NoBooksSection />
        )}
        <Suspense fallback={<WidgetSkeleton tall />}>
          <BoardWidget
            result={friendFeed}
            recentEntries={recentEntries}
            userId={user.id}
            todayKst={todayKst}
          />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <StatsWidget result={stats} name={name} />
        </Suspense>
      </section>
    </div>
  );
}
