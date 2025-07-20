'use client';

import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  streak: number;
  weekActivity: boolean[];
}

export function WeeklyStreakSection({ streak, weekActivity }: Props) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow border border-gray-200 dark:border-gray-700 mb-6">
      <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">📅 이번 주의 리듬</h2>
      <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 mt-2">
        {weekActivity.map((didWrite, idx) => {
          const date = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), idx);
          const today = new Date();
          const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          const isPast = date < new Date(today.setHours(0, 0, 0, 0));

          const baseClass =
            'w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold border';
          const className = didWrite
            ? `${baseClass} bg-green-500 text-white`
            : isPast && !isToday
              ? `${baseClass} bg-red-200 text-red-700 dark:bg-red-900 dark:text-red-300`
              : `${baseClass} bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400`;

          return (
            <div key={idx} className={className}>
              {
                format(date, 'EE', {
                  locale: ko,
                })[0]
              }
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-md inline-block">
        {streak > 0 ? (
          <>🔥 현재 {streak}일 연속 기록 중!</>
        ) : (
          <>🕓 아직 기록을 시작하지 않았어요!</>
        )}
      </p>
    </div>
  );
}
