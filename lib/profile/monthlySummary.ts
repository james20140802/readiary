export interface MonthlySummary {
  label: string;
  count: number;
}

/**
 * entryDates(yyyy-MM-dd)를 월 단위로 집계해 최근 months개월(이번 달 포함)을 최신순으로 반환한다.
 * 기록이 없는 달도 count 0으로 채운다.
 */
export function summarizeByMonth(
  entryDates: string[],
  todayKst: string,
  months: number
): MonthlySummary[] {
  const countsByMonthKey = new Map<string, number>();
  for (const date of entryDates) {
    const key = date.slice(0, 7);
    countsByMonthKey.set(key, (countsByMonthKey.get(key) ?? 0) + 1);
  }

  const [todayYear, todayMonth] = todayKst.slice(0, 7).split('-').map(Number);
  const startIndex = todayYear * 12 + (todayMonth - 1);

  return Array.from({ length: months }, (_, i) => {
    const monthIndex = startIndex - i;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return { label: `${year}년 ${month}월`, count: countsByMonthKey.get(key) ?? 0 };
  });
}
