import { TodaySummarySection } from './_components/TodaySummarySection';
import { InProgressBooksSection } from './_components/InProgressBooksSection';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import { StatsSection } from './_components/StatsSection';
import SocialFeed from './_components/SocialFeed';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  let stats = {
    bookCount: 0,
    entryCount: 0,
    totalPagesRead: 0,
  };
  let inProgressCount = 0;

  if (!userError && user) {
    const { data: userBooks } = await supabase
      .from('user_books')
      .select('id, progress, is_finished')
      .eq('user_id', user.id);

    const bookCount = userBooks ? userBooks.length : 0;
    const totalPagesRead = userBooks ? userBooks.reduce((sum, b) => sum + (b.progress ?? 0), 0) : 0;

    const inProgress = userBooks?.filter((b) => !b.is_finished) ?? [];
    inProgressCount = inProgress.length;

    let entryCount = 0;
    if (bookCount > 0) {
      const bookIds = (userBooks ?? []).map((b) => b.id);
      const { count: rawCount } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .in('user_book_id', bookIds);

      entryCount = rawCount ?? 0;
    }

    stats = { bookCount, entryCount, totalPagesRead };
  }

  return (
    <main className="w-full">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        👋 반가워요! 오늘의 독서를 시작해볼까요?
      </h1>
      <WeeklyStreakSection />

      <div className="mt-10 space-y-8">
        <TodaySummarySection />
        {inProgressCount > 0 ? <InProgressBooksSection /> : <NoBooksSection />}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
          📢 친구들의 최근 활동
        </h2>
        <SocialFeed />
      </div>

      <StatsSection stats={stats} />
    </main>
  );
}
