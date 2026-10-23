import { redirect } from 'next/navigation';
import Composer from '@/components/today/Composer';
import TodayView from '@/components/today/TodayView';
import { fetchDashboardData } from '@/lib/dashboard/fetchDashboardData';
import { fetchRecallEntry } from '@/lib/recall/fetchRecallEntry';
import { getServerUser } from '@/lib/supabase/getServerUser';

export default async function TodayPage() {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) redirect('/login');

  // 회상은 함께 출발시키되 기다리지 않는다 — 도착하면 간지가 나타난다. 핵심 데이터만 쓰기를 막는다.
  const recall = fetchRecallEntry();
  const data = await fetchDashboardData();
  const {
    books,
    weekActivity,
    recentUserBookId,
    todayKst,
    weeklyCount,
    latestTexts,
    recentEntries,
  } = data;

  const composer = (
    <Composer key={user.id} userId={user.id} books={books} recentUserBookId={recentUserBookId} />
  );

  return (
    <TodayView
      todayKst={todayKst}
      weeklyCount={weeklyCount}
      weekActivity={weekActivity}
      books={books}
      latestTexts={latestTexts}
      recentUserBookId={recentUserBookId}
      recentEntries={recentEntries}
      recall={recall}
      composer={composer}
    />
  );
}
