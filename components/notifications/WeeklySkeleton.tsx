import { addDays, format, parseISO } from 'date-fns';
import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import { formatReadingPeriod, todayKST } from '@/lib/dates';
import WeeklyRecords from './WeeklyRecords';
import type { WeeklyEntry } from './WeeklyTimeline';

function entries(today: string): WeeklyEntry[] {
  const day = (ago: number) => format(addDays(parseISO(today), -ago), 'yyyy-MM-dd');
  const book = (title: string) => ({ books: { title } });
  return [
    {
      id: 'skeleton-0',
      date: day(0),
      is_private: false,
      quote: filler(34),
      note: filler(24),
      user_books: book(filler(8)),
    },
    {
      id: 'skeleton-1',
      date: day(0),
      is_private: false,
      quote: filler(28),
      note: null,
      user_books: book(filler(6)),
    },
    {
      id: 'skeleton-2',
      date: day(2),
      is_private: false,
      quote: null,
      note: filler(30),
      user_books: book(filler(9)),
    },
    {
      id: 'skeleton-3',
      date: day(5),
      is_private: false,
      quote: null,
      note: null,
      user_books: book(filler(5)),
    },
  ];
}

/** 이번 주의 기록을 불러오는 동안 — 실제 WeeklyRecords를 자리용 기록으로 그린다 */
export default function WeeklySkeleton() {
  const today = todayKST();
  const rows = entries(today);
  const period = formatReadingPeriod([rows[rows.length - 1].date, rows[0].date]) ?? '';
  return (
    <SkeletonScope label="이번 주의 기록을 펼치는 중">
      <WeeklyRecords entries={rows} failed={false} period={period} />
    </SkeletonScope>
  );
}
