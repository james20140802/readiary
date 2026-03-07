'use client';

import Card from '@/components/ui/Card';
import { format, startOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useState, useEffect } from 'react';

interface Props {
  streak: number;
  weekActivity: boolean[];
}

export function WeeklyStreakSection({ streak, weekActivity }: Props) {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    setToday(new Date());
  }, []);

  if (!mounted) {
    return <div className="min-h-[200px]" />;
  }

  const startDate = startOfWeek(today, { weekStartsOn: 0 });

  return (
    <Card className="mb-6 px-5 py-6" hoverable={false}>
      <h2 className="text-section-title font-bold text-label dark:text-label-invert mb-4">
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
              ? 'bg-success text-white border-success'
              : isPast && !isToday
                ? 'bg-danger-subtle text-danger border-danger-muted dark:bg-danger/20 dark:text-danger dark:border-danger/30'
                : 'bg-surface-raised text-label-muted border-border dark:bg-dark-raised dark:text-label-muted dark:border-dark-border';

            return (
              <div key={index} className={`${baseStyle} ${stateClass}`}>
                {format(date, 'EE', { locale: ko })[0]}
              </div>
            );
          })}
        </div>
        <div className="w-full text-left">
          <p className="text-sm text-label-sub dark:text-label-muted bg-surface-raised dark:bg-dark-raised px-3 py-1 rounded-md max-w-fit">
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
