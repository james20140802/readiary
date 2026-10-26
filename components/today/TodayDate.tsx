import clsx from 'clsx';
import { todayHeading, weekOrdinal } from './todayCopy';
import s from './today.module.css';

/** 오늘 장 머리의 큰 날짜 — 시안 home2 .date. 보조기기에는 "10월 6일 화요일" 순서로 한 번에 읽힌다 */
export default function TodayDate({
  todayKst,
  weeklyCount,
  desk,
}: {
  todayKst: string;
  weeklyCount: number;
  desk?: boolean;
}) {
  const { day, month, weekday } = todayHeading(todayKst);
  const ordinal = weekOrdinal(weeklyCount);
  return (
    <>
      <p className="sr-only">
        {month} {day}일 {weekday}, {ordinal}
      </p>
      <div aria-hidden className={clsx(s.date, desk && s.deskDate)}>
        <div className={clsx(s.num, 'text-ink')}>{day}</div>
        <div>
          <div className={clsx(s.month, 'font-sans text-ink')}>{month}</div>
          <div className={clsx(s.weekday, 'font-sans')}>
            {weekday} · <span data-skeleton>{ordinal}</span>
          </div>
        </div>
      </div>
    </>
  );
}
