import AnimatedSection from '@/components/ui/AnimatedSection';
import { TodaySummarySection } from './_components/TodaySummarySection';
import { InProgressBooksSection } from './_components/InProgressBooksSection';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import SocialFeed from './_components/SocialFeed';
import GreetingHeader from './_components/GreetingHeader';
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
      <GreetingHeader />

      <AnimatedSection>
        <WeeklyStreakSection streak={streak} weekActivity={weekActivity} />
        <TodaySummarySection entry={entry} />
        {books && books.length > 0 ? (
          <InProgressBooksSection myBooks={books} />
        ) : (
          <NoBooksSection />
        )}
      </AnimatedSection>

      <SocialFeed feed={socialFeedEntries} />
    </main>
  );
}
