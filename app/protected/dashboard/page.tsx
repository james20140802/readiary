import AnimatedSection from '@/components/ui/AnimatedSection';
import Composer from './_components/Composer';
import { InProgressBooksSection } from './_components/InProgressBooksSection';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import SocialFeed from './_components/SocialFeed';
import GreetingHeader from './_components/GreetingHeader';
import { fetchDashboardData } from '@/lib/dashboard/fetchDashboardData';
import { notFound } from 'next/navigation';
import { fetchSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DASHBOARD_SOCIAL_FEED_PAGINATION_LIMIT } from '@/constants/social';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [data, socialFeedEntries, { data: profile }] = await Promise.all([
    fetchDashboardData(),
    fetchSocialFeedEntries(0, DASHBOARD_SOCIAL_FEED_PAGINATION_LIMIT),
    supabase.from('profiles').select('name').eq('id', user?.id).single(),
  ]);
  if (!data) return notFound();

  const { books, entry, streak, weekActivity, recentUserBookId } = data;

  return (
    <main className="w-full">
      <GreetingHeader name={profile?.name ?? null} />

      <AnimatedSection>
        <Composer
          books={books ?? []}
          recentUserBookId={recentUserBookId}
          userId={user.id}
        />
        <WeeklyStreakSection streak={streak} weekActivity={weekActivity} entry={entry} />
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
