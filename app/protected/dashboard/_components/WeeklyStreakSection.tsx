'use client';

import Card from '@/components/ui/Card';
import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  streak: number;
  weekActivity: boolean[];
}

export function WeeklyStreakSection({ streak, weekActivity }: Props) {
  const today = new Date();
  const startDate = startOfWeek(today, { weekStartsOn: 0 });

  return (
    <Card className="mb-6 px-5 py-6">
      <h2 className="text-section-title font-bold text-label dark:text-white mb-4">
        📅 이번 주의 리듬
      </h2>
      <div className="flex flex-col items-center gap-5">
        <div className="flex justify-center gap-2 sm:gap-3 md:gap-4">
          {weekActivity.map((didWrite, index) => {
            const date = addDays(startDate, index);
            const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            const isPast = date < new Date(today.setHours(0, 0, 0, 0));

            const baseStyle =
              'w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold border';
            const stateClass = didWrite
              ? 'bg-green-500 text-white'
              : isPast && !isToday
                ? 'bg-red-200 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400';

            return (
              <div key={index} className={`${baseStyle} ${stateClass}`}>
                {format(date, 'EE', { locale: ko })[0]}
              </div>
            );
          })}
        </div>
        <div className="w-full text-left">
          <p className="text-sm text-secondary dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-md max-w-fit">
            {streak > 0 ? (
              <>🔥 현재 {streak}일 연속 기록 중!</>
            ) : (
              <>🕓 아직 기록을 시작하지 않았어요!</>
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}
