import { formatInTimeZone } from 'date-fns-tz';

const KST = 'Asia/Seoul';

export function toKSTDateString(d: Date): string {
  return formatInTimeZone(d, KST, 'yyyy-MM-dd');
}

export function todayKST(): string {
  return toKSTDateString(new Date());
}

/** 'YYYY-MM-DD' → '2026. 8. 12.' — 타임존을 타지 않도록 문자열로만 다룬다 */
export function formatKoreanDate(date: string): string | null {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return `${y}. ${m}. ${d}.`;
}

/**
 * 읽기 기간 한 줄 — 첫 날짜와 마지막 날짜를 '2026. 6. 3. — 8. 12.'로.
 * 같은 해면 뒤쪽 연도를 생략하고, 하루짜리면 날짜 하나만 쓴다.
 */
export function formatReadingPeriod(dates: string[]): string | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].map((d) => d.slice(0, 10)).sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const from = formatKoreanDate(first);
  if (!from) return null;
  if (first === last) return from;
  const [fy] = first.split('-').map(Number);
  const [ly, lm, ld] = last.split('-').map(Number);
  if (!ly || !lm || !ld) return null;
  const to = fy === ly ? `${lm}. ${ld}.` : `${ly}. ${lm}. ${ld}.`;
  return `${from} — ${to}`;
}
