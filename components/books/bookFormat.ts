/**
 * 책 화면의 짧은 표기 — 시안 books.html·book-layer.html의 문구 그대로.
 * 날짜는 'YYYY-MM-DD' 문자열로만 다뤄 시간대를 타지 않는다(lib/dates와 같은 원칙).
 */
import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_TIME_ZONE } from './flags';

function parts(date: string): [number, number, number] | null {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return y && m && d ? [y, m, d] : null;
}

/** '2026-10-06' → '10.6' (원고 여백의 날짜) */
export function shortDate(date: string): string {
  const p = parts(date);
  return p ? `${p[1]}.${p[2]}` : date;
}

/** '2026-09-29' → '9월 29일' */
export function monthDay(date: string): string {
  const p = parts(date);
  return p ? `${p[1]}월 ${p[2]}일` : date;
}

/** 'p.184' 또는 'p.12–20'. 쪽이 없으면 null */
export function pageLabel(fromPage: number | null, toPage: number | null): string | null {
  if (fromPage != null && toPage != null && fromPage !== toPage) return `p.${fromPage}–${toPage}`;
  const p = fromPage ?? toPage;
  return p != null ? `p.${p}` : null;
}

/** 두 날짜 사이의 날 수(b - a) */
export function daysBetween(a: string, b: string): number | null {
  const pa = parts(a);
  const pb = parts(b);
  if (!pa || !pb) return null;
  const ta = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((tb - ta) / 86_400_000);
}

const NATIVE_DAYS = ['', '하루', '이틀', '사흘', '나흘', '닷새', '엿새'];

/** 기록한 날로부터 덧붙인 생각까지 — '나흘 뒤에', '일주일 뒤에', '그날' */
export function laterLabel(days: number): string {
  if (days <= 0) return '그날';
  if (days < 7) return `${NATIVE_DAYS[days]} 뒤에`;
  if (days < 14) return '일주일 뒤에';
  if (days < 30) return `${Math.floor(days / 7)}주 뒤에`;
  if (days < 365) return `${Math.floor(days / 30)}달 뒤에`;
  return `${Math.floor(days / 365)}년 뒤에`;
}

/** 시각(ISO) → 사용자 시간대의 'YYYY-MM-DD' */
export function localDay(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string | null {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? null : formatInTimeZone(t, timeZone, 'yyyy-MM-dd');
}

/** 기록한 날과 덧붙인 시각 → '나흘 뒤에 덧붙인 생각' */
export function addedThoughtLabel(entryDate: string, addedAt: string): string {
  const day = localDay(addedAt);
  const diff = day ? daysBetween(entryDate, day) : null;
  if (diff == null) return '덧붙인 생각';
  return diff <= 0 ? '그날 덧붙인 생각' : `${laterLabel(diff)} 덧붙인 생각`;
}

/** 오늘 기준으로 마지막 기록이 언제였는지 — '오늘 남김', '어제 남김', '3일 전' */
export function lastRecordedLabel(lastDate: string, today: string): string {
  const d = daysBetween(lastDate, today);
  if (d == null) return '';
  if (d <= 0) return '오늘 남김';
  if (d === 1) return '어제 남김';
  if (d < 7) return `${d}일 전`;
  return monthDay(lastDate);
}

/** 진행 — 잉크 분수 '184 / 352'의 두 부분. 전체 쪽수를 모르면 total은 null */
export function progressParts(
  lastReadPage: number | null,
  totalPages: number | null
): { read: number | null; total: number | null } {
  return { read: lastReadPage, total: totalPages != null && totalPages > 0 ? totalPages : null };
}

/**
 * 간지 큰 제목 — 'A: B'·'A - B'처럼 부제가 붙은 제목은 부제를 떼어 작은 줄로 보낸다.
 * 앞부분이 너무 짧으면(2자 이하) 떼지 않는다.
 */
export function splitTitle(title: string): { main: string; sub: string | null } {
  const m = /^(.{3,}?)\s*(?::|\s[-–—]\s)\s*(.+)$/.exec(title.trim());
  if (!m) return { main: title.trim(), sub: null };
  return { main: m[1].trim(), sub: m[2].trim() };
}

/** 큰 제목 글자 크기 단계 — 길수록 작게 써서 간지가 제목으로 길어지지 않게 한다 */
export function titleTier(main: string): 'lg' | 'md' | 'sm' {
  const n = [...main].length;
  if (n <= 12) return 'lg';
  if (n <= 22) return 'md';
  return 'sm';
}
