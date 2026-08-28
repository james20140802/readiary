import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';

export interface MonthlyRecap {
  label: string;
  entryCount: number;
  quoteCount: number;
  bookCount: number;
}

/** KST 오늘이 매월 1일인지 — 'yyyy-MM-dd' 문자열이라 접미사 비교로 충분하다 */
export function isMonthlyRecapDay(todayKst: string): boolean {
  return todayKst.endsWith('-01');
}

/** 오늘(KST, 'yyyy-MM-dd') 기준 지난달 1일~말일 범위와 한글 라벨 */
export function prevMonthRange(todayKst: string): { start: string; end: string; label: string } {
  const prevMonth = subMonths(parseISO(todayKst), 1);
  const start = startOfMonth(prevMonth);
  const end = endOfMonth(prevMonth);

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    label: format(start, 'yyyy년 M월'),
  };
}
