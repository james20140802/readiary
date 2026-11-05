import type { MonthKey } from './types';

/** 끝난 달 = KST 오늘이 속한 달보다 앞선 달. todayKst는 'YYYY-MM-DD'. */
export function isFinishedMonth(month: MonthKey, todayKst: string): boolean {
  return month < todayKst.slice(0, 7);
}

export function isMonthKey(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

/** '2026-03' → '2026년 3월' */
export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-');
  return `${y}년 ${Number(m)}월`;
}

/** '2026-03' → '3월' */
export function shortMonthLabel(month: MonthKey): string {
  return `${Number(month.split('-')[1])}월`;
}
