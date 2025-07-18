'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { format, isSameDay, parseISO, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

export function WeeklyStreakSection() {
  const supabase = createSupabaseClient();
  const [weekData, setWeekData] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const fetchEntries = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const start = startOfWeek(new Date(), { weekStartsOn: 0 });
      const end = addDays(start, 6);

      const { data: entries } = await supabase
        .from('entries')
        .select('date')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'));

      const weekDays = [...Array(7)].map((_, i) => addDays(start, i));
      const hasEntry = weekDays.map((day) => {
        return entries?.some((e) => isSameDay(parseISO(e.date), day)) ?? false;
      });

      setWeekData(hasEntry);

      // streak 계산: 오늘을 기준으로 연속된 true 개수
      let streakCount = 0;
      for (let i = new Date().getDay(); i >= 0; i--) {
        if (hasEntry[i]) streakCount++;
        else break;
      }
      setStreak(streakCount);
    };

    fetchEntries();
  }, [supabase]);

  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow border border-gray-200 dark:border-gray-700 mb-6">
      <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">📅 이번 주의 리듬</h2>
      <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 mt-2">
        {weekData.map((didWrite, idx) => (
          <div
            key={idx}
            className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold border
              ${didWrite ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}
            `}
          >
            {
              format(addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), idx), 'EE', {
                locale: ko,
              })[0]
            }
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-md inline-block">
        🔥 현재 {streak}일 연속 기록 중!
      </p>
    </div>
  );
}
