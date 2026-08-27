import { addDays, format, parseISO, startOfWeek, subDays } from 'date-fns';

const DAY = 'yyyy-MM-dd';

/** todayKst가 속한 주(일요일 시작)의 7개 날짜 문자열 */
export function weekDatesKST(todayKst: string): string[] {
  const start = startOfWeek(parseISO(todayKst), { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), DAY));
}

/** todayKst부터 거꾸로 연속 기록일 수. 오늘 기록이 없으면 어제부터 센다. */
export function calcStreak(recordedDates: Set<string>, todayKst: string): number {
  let cursor = parseISO(todayKst);
  if (!recordedDates.has(todayKst)) cursor = subDays(cursor, 1);
  let streak = 0;
  while (recordedDates.has(format(cursor, DAY))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** 이번 주 7일 각각의 기록 여부 */
export function calcWeekActivity(recordedDates: Set<string>, todayKst: string): boolean[] {
  return weekDatesKST(todayKst).map((d) => recordedDates.has(d));
}

/** 이번 주에 속한 기록 개수 — 같은 날 여러 건이면 전부 센다 */
export function countWeekEntries(entryDates: string[], todayKst: string): number {
  const week = new Set(weekDatesKST(todayKst));
  return entryDates.filter((d) => week.has(d)).length;
}
