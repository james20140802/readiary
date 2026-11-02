/** 기록 꺼내기 '한 달' 고르기 — 기록이 있는 달 목록을 연도별 열두 칸 달력으로 */

export interface EntryMonth {
  /** 'YYYY-MM' */
  month: string;
  entryCount: number;
}

export interface MonthCell {
  /** 'YYYY-MM' */
  month: string;
  /** 1~12 */
  m: number;
  /** 기록이 없는 달은 0 — 칸은 남기고 고를 수 없게 한다 */
  entryCount: number;
}

export const yearOf = (month: string) => Number(month.slice(0, 4));

/** 기록이 있는 해, 오래된 해부터 */
export function entryYears(months: EntryMonth[]): number[] {
  return [...new Set(months.map((m) => yearOf(m.month)))].sort((a, b) => a - b);
}

/** 그 해의 1월~12월 칸 */
export function yearCells(months: EntryMonth[], year: number): MonthCell[] {
  const counts = new Map(months.map((m) => [m.month, m.entryCount]));
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`;
    return { month, m: i + 1, entryCount: counts.get(month) ?? 0 };
  });
}

/** 기록이 있는 바로 앞(-1)·뒤(+1) 해 — 기록 없는 해는 건너뛴다, 없으면 null */
export function adjacentYear(years: number[], year: number, step: -1 | 1): number | null {
  const candidates = step < 0 ? years.filter((y) => y < year) : years.filter((y) => y > year);
  if (candidates.length === 0) return null;
  return step < 0 ? candidates[candidates.length - 1] : candidates[0];
}
