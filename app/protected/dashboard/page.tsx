import AnimatedSection from '@/components/ui/AnimatedSection';
import Composer from './_components/Composer';
import { InProgressBooksSection } from './_components/InProgressBooksSection';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import { RecallCard } from './_components/RecallCard';
import { MonthlyRecapCard } from './_components/MonthlyRecapCard';
import GreetingHeader from './_components/GreetingHeader';
import { fetchDashboardData } from '@/lib/dashboard/fetchDashboardData';
import { fetchRecallEntry } from '@/lib/recall/fetchRecallEntry';
import { fetchMonthlyRecap } from '@/lib/retrospect/fetchMonthlyRecap';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [data, recall, recap, { data: profile }] = await Promise.all([
    fetchDashboardData(),
    fetchRecallEntry(),
    fetchMonthlyRecap(),
    supabase.from('profiles').select('name').eq('id', user?.id).single(),
  ]);
  if (!data) return notFound();

  const { books, entry, streak, weekActivity, recentUserBookId, todayKst, weeklyCount } = data;

  return (
    <main className="w-full">
      <GreetingHeader name={profile?.name ?? null} />

      <AnimatedSection>
        {recap && <MonthlyRecapCard recap={recap} />}
        <Composer
          books={books ?? []}
          recentUserBookId={recentUserBookId}
          userId={user.id}
        />
        {recall && <RecallCard recall={recall} />}
        <WeeklyStreakSection
          weeklyCount={weeklyCount}
          streak={streak}
          weekActivity={weekActivity}
          todayKst={todayKst}
          entry={entry}
        />
        {books && books.length > 0 ? (
          <InProgressBooksSection myBooks={books} />
        ) : (
          <NoBooksSection />
        )}
      </AnimatedSection>
    </main>
  );
}
