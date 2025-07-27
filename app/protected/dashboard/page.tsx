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
import { Suspense } from 'react';
import Loading from './Loading';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [data, socialFeedEntries, { data: profile }] = await Promise.all([
    fetchDashboardData(),
    fetchSocialFeedEntries(),
    supabase.from('profiles').select('name').eq('id', user?.id).single(),
  ]);
  if (!data) return notFound();

  const { books, entry, streak, weekActivity } = data;

  return (
    <main className="w-full">
      <Suspense fallback={<Loading />}>
        <GreetingHeader name={profile?.name ?? null} />
      </Suspense>

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
