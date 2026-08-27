import { todayKST } from '@/lib/dates';

/** quote/note 중 하나라도 실질 내용이 있는지 — 공백만 있는 문자열은 내용 없음으로 본다 */
export function hasEntryContent(quote?: string | null, note?: string | null): boolean {
  return (
    (typeof quote === 'string' && quote.trim() !== '') ||
    (typeof note === 'string' && note.trim() !== '')
  );
}

/** KST 기준 미래 날짜인지 — 'yyyy-MM-dd' 문자열은 사전순 비교로 충분하다 */
export function isFutureKSTDate(date: string): boolean {
  return date > todayKST();
}
