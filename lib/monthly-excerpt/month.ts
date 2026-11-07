import type { MonthKey } from './types';

/** 끝난 달 = KST 오늘이 속한 달보다 앞선 달. todayKst는 'YYYY-MM-DD'. */
export function isFinishedMonth(month: MonthKey, todayKst: string): boolean {
  return month < todayKst.slice(0, 7);
}

/** SQL의 monthly_excerpt_month_start와 같은 규칙: 해의 첫 자리는 0이 아니다. */
export function isMonthKey(s: string): boolean {
  return /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(s);
}

/** 쿼리의 해. 네 자리이고 1900 이상일 때만 숫자로, 아니면 null. */
export function parseYear(raw: string | null): number | null {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 1900 ? year : null;
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

/** '2026-03-14' → '3월 14일'. 달의 발췌집은 달이 표제에 있어 해를 다시 적지 않는다. */
export function dayLabel(date: string): string {
  const [, m, d] = date.slice(0, 10).split('-').map(Number);
  return m && d ? `${m}월 ${d}일` : date;
}

/** 오늘 화면의 엮기 안내는 달이 바뀐 뒤 1~7일(KST)에만 낸다. todayKst는 'YYYY-MM-DD'. */
export function isPromptWindow(todayKst: string): boolean {
  const day = Number(todayKst.slice(8, 10));
  return day >= 1 && day <= 7;
}
