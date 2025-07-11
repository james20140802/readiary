'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { TodaySummarySection } from './_components/TodaySummarySection';
import { InProgressBooksSection } from './_components/InProgressBooksSection';
import { NoBooksSection } from './_components/NoBooksSection';
import { WeeklyStreakSection } from './_components/WeeklyStreakSection';

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

      <div className="mt-12 space-y-4">
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">📈 나의 독서 통계</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="등록한 책" value={stats.bookCount} icon="📚" />
          <StatCard label="작성한 기록" value={stats.entryCount} icon="✍️" />
          <StatCard label="읽은 페이지 수" value={stats.totalPagesRead} icon="📖" />
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 p-5 border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-center justify-between">
        <div className="text-3xl">{icon}</div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
