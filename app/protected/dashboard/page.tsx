import { TodaySummarySection } from './_components/TodaySummarySection';
import { InProgressBooksSection } from './_components/InProgressBooksSection';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import SocialFeed from './_components/SocialFeed';
import { fetchDashboardData } from '@/lib/dashboard/fetchDashboardData';
import { notFound } from 'next/navigation';
import { fetchSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';

export default async function DashboardPage() {
  const [data, socialFeedEntries] = await Promise.all([
    fetchDashboardData(),
    fetchSocialFeedEntries(),
  ]);
  if (!data) return notFound();

  const { books, entry, streak, weekActivity } = data;

  return (
    <main className="w-full">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        👋 반가워요! 오늘의 독서를 시작해볼까요?
      </h1>
      <WeeklyStreakSection streak={streak} weekActivity={weekActivity} />

      <div className="mt-10 space-y-8">
        <TodaySummarySection entry={entry} />
        {books && books.length > 0 ? (
          <InProgressBooksSection myBooks={books} />
        ) : (
          <NoBooksSection />
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
          📢 친구들의 최근 활동
        </h2>
        <SocialFeed feed={socialFeedEntries} />
      </div>
    </main>
  );
}
