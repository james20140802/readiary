'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';

export function TodaySummarySection() {
  const supabase = createSupabaseClient();
  const [summary, setSummary] = useState<{ bookTitle: string; preview: string } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const fetchTodayEntry = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: entries } = await supabase
        .from('entries')
        .select('summary, user_book_id, created_at')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (entries && entries.length > 0) {
        const entry = entries[0];

        const { data: bookData } = await supabase
          .from('user_books')
          .select('book:books(title)')
          .eq('id', entry.user_book_id)
          .single();

        if (bookData?.book?.title) {
          setSummary({
            bookTitle: bookData.book.title,
            preview: entry.summary?.slice(0, 100) ?? '',
          });
        }
      }

      setChecked(true);
    };

    fetchTodayEntry();
  }, []);

  return (
    <section className="mb-6 rounded-xl bg-blue-50 dark:bg-gray-900 p-5 border border-blue-200 dark:border-gray-700 shadow">
      {summary ? (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">📖 오늘 읽은 책</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {summary.bookTitle}
          </h2>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 italic">
            &quot;{summary.preview}...&quot;
          </p>
        </div>
      ) : checked ? (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">🕐 오늘은 아직 기록이 없어요</p>
          <p className="text-md font-medium text-gray-800 dark:text-white mt-1">
            하루 한 줄 기록, 지금 써보는 건 어때요?
          </p>
        </div>
      ) : null}
    </section>
  );
}
