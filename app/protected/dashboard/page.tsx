'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { TodaySummarySection } from './_components/TodaySummarySection';
import { InProgressBooksSection } from './_components/InProgressBooksSection';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';
import { StatsSection } from './_components/StatsSection';

type DashboardStats = {
  bookCount: number;
  entryCount: number;
  totalPagesRead: number;
};

export default function DashboardPage() {
  const supabase = createSupabaseClient();
  const [stats, setStats] = useState<DashboardStats>({
    bookCount: 0,
    entryCount: 0,
    totalPagesRead: 0,
  });
  const [inProgressCount, setInProgressCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      const { data: userBooks } = await supabase
        .from('user_books')
        .select('id, progress, is_finished')
        .eq('user_id', user.id);

      const bookCount = userBooks ? userBooks.length : 0;
      const totalPagesRead = userBooks
        ? userBooks.reduce((sum, b) => sum + (b.progress ?? 0), 0)
        : 0;

      const inProgress = userBooks?.filter((b) => !b.is_finished) ?? [];
      setInProgressCount(inProgress.length);

      let entryCount = 0;
      if (bookCount > 0) {
        const bookIds = (userBooks ?? []).map((b) => b.id);

        const { count: rawCount } = await supabase
          .from('entries')
          .select('*', { count: 'exact', head: true })
          .in('user_book_id', bookIds);

        entryCount = rawCount ?? 0;
      }

      setStats({ bookCount, entryCount, totalPagesRead });
    };

    fetchStats();
  }, [supabase]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        👋 반가워요! 오늘의 독서를 시작해볼까요?
      </h1>
      <WeeklyStreakSection />

      <div className="mt-10 space-y-8">
        <TodaySummarySection />
        {inProgressCount > 0 ? <InProgressBooksSection /> : <NoBooksSection />}
      </div>

      <StatsSection stats={stats} />
    </main>
  );
}
