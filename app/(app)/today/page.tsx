import { redirect } from 'next/navigation';
import Composer from '@/components/today/Composer';
import TodayView from '@/components/today/TodayView';
import { fetchDashboardData } from '@/lib/dashboard/fetchDashboardData';
import { fetchExcerptPrompt } from '@/lib/monthly-excerpt/server';
import { isPromptWindow } from '@/lib/monthly-excerpt/month';
import { todayKST } from '@/lib/dates';
import { fetchRecallEntry } from '@/lib/recall/fetchRecallEntry';
import { getServerUser } from '@/lib/supabase/getServerUser';

export default async function TodayPage() {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) redirect('/login');

  // 회상은 함께 출발시키되 기다리지 않는다 — 도착하면 간지가 나타난다. 핵심 데이터만 쓰기를 막는다.
  const recall = fetchRecallEntry();
  // 지난달 엮기 안내도 기다리지 않는다 — 달이 바뀐 뒤 1~7일에만 묻고, 실패하면 안내만 빠진다
  const promptDay = todayKST();
  const excerptPrompt = isPromptWindow(promptDay)
    ? fetchExcerptPrompt(promptDay).catch(() => null)
    : Promise.resolve(null);
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
      excerptPrompt={excerptPrompt}
      composer={composer}
    />
  );
}
