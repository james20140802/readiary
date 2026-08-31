import Card from '@/components/ui/Card';
import { weekDatesKST } from '@/lib/dashboard/streak';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  weeklyCount: number;
  weekActivity: boolean[];
  todayKst: string;
}

/** 주간 리듬 — 시안 .rhythm 그대로: 요일 도장 한 줄 + 세리프 카운트. 연속 N일 압박 없음. */
export function WeeklyStreakSection({ weeklyCount, weekActivity, todayKst }: Props) {
  const weekDates = weekDatesKST(todayKst);

  return (
    <Card hoverable={false} className="flex items-center justify-between gap-6 px-5 py-[18px]">
      <div className="flex max-w-[440px] flex-1 justify-between gap-1.5">
        {weekActivity.map((didWrite, index) => {
          const d = weekDates[index];
          const isToday = d === todayKst;
          const dayLabel = format(parseISO(d), 'EE', { locale: ko })[0];

          return (
            <div key={d} className="text-center text-[10px] text-ink-faint">
              <span
                className={`mb-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border font-serif text-[11px] sm:h-7 sm:w-7 ${
                  didWrite
                    ? 'border-ink bg-ink text-card'
                    : isToday
                      ? 'border-[1.5px] border-accent text-accent'
                      : 'border-hairline-strong'
                }`}
              >
                {didWrite ? '✓' : isToday ? '·' : ''}
              </span>
              {dayLabel}
            </div>
          );
        })}
      </div>
      <div className="text-right font-serif text-[13px] leading-normal text-ink">
        <b className="text-lg text-accent">{weeklyCount}</b>
        <br />
        이번 주 문장
      </div>
    </Card>
  );
}
