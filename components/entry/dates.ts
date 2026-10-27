import { toKSTDateString } from '@/lib/dates';
import { koreanCount } from '@/components/books/ExcerptBooklet';

/**
 * 기록 한 장·발췌집이 쓰는 날짜 말. 날짜 문자열('YYYY-MM-DD')만 다뤄 시간대를 타지 않고,
 * 시각(ISO)은 서울 날짜로 바꿔 센다.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
// 달 셈은 '석 달', '넉 달'처럼 읽는다
const MONTH_WORDS = ['한', '두', '석', '넉', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한'];
const NEAR_DAYS = ['같은 날', '하루 뒤', '이틀 뒤', '사흘 뒤', '나흘 뒤'];

function parse(date: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function utc(date: string): number {
  const p = parse(date);
  return p ? Date.UTC(p.y, p.m - 1, p.d) : NaN;
}

/** 두 날짜 사이의 날 수(뒤 - 앞) */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

function span(days: number): { kind: 'day' | 'month' | 'year'; n: number } {
  if (days < 30) return { kind: 'day', n: days };
  if (days < 365) return { kind: 'month', n: Math.min(11, Math.floor(days / 30)) };
  return { kind: 'year', n: Math.floor(days / 365) };
}

/** 기록한 날로부터 얼마 뒤 — '이틀 뒤', '20일 뒤', '석 달 뒤' */
export function laterLabel(days: number): string {
  if (days < NEAR_DAYS.length) return NEAR_DAYS[Math.max(0, days)];
  const s = span(days);
  if (s.kind === 'day') return `${s.n}일 뒤`;
  if (s.kind === 'month') return `${MONTH_WORDS[s.n - 1]} 달 뒤`;
  return `${s.n}년 뒤`;
}

/** 오늘로부터 얼마 전 — '오늘', '어제', '20일 전', '두 달 전' */
export function agoLabel(days: number): string {
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  const s = span(days);
  if (s.kind === 'day') return `${s.n}일 전`;
  if (s.kind === 'month') return `${MONTH_WORDS[s.n - 1]} 달 전`;
  return `${s.n}년 전`;
}

/** '오늘' · '9월 18일' · '2025년 9월 18일' */
export function monthDay(date: string, today: string): string {
  if (date.slice(0, 10) === today.slice(0, 10)) return '오늘';
  const p = parse(date);
  if (!p) return date;
  const t = parse(today);
  return t && t.y === p.y ? `${p.m}월 ${p.d}일` : `${p.y}년 ${p.m}월 ${p.d}일`;
}

/** 상단 바 제목 — 올해면 '9월 16일', 다른 해면 '2025년 9월 16일'(오늘도 날짜로) */
export function shortDate(date: string, today: string): string {
  const p = parse(date);
  if (!p) return date;
  return today.slice(0, 4) === String(p.y) ? `${p.m}월 ${p.d}일` : `${p.y}년 ${p.m}월 ${p.d}일`;
}

/** 덧붙인 생각 간지의 머리 — '이틀 뒤 · 9월 18일' */
export function slipLabel(entryDate: string, createdAt: string, today: string): string {
  const on = toKSTDateString(new Date(createdAt));
  return `${laterLabel(daysBetween(entryDate, on))} · ${monthDay(on, today)}`;
}

/** 기록 한 장의 날짜 머리 — 큰 날 숫자, 달, '수요일 · 20일 전' */
export function dateParts(
  date: string,
  today: string
): { day: number; month: string; meta: string } | null {
  const p = parse(date);
  const t = parse(today);
  if (!p || !t) return null;
  const weekday = WEEKDAYS[new Date(utc(date)).getUTCDay()];
  const ago = agoLabel(daysBetween(date, today));
  const year = p.y === t.y ? '' : `${p.y}년 · `;
  return { day: p.d, month: `${p.m}월`, meta: `${year}${weekday} · ${ago}` };
}

function fullMonthDay(date: string, withYear: boolean): string {
  const p = parse(date)!;
  return `${withYear ? `${p.y}년 ` : ''}${p.m}월 ${p.d}일`;
}

/** 발췌집 표제지 — '8월 30일부터 9월 21일까지, 문장 열네 개를 옮겨 적었습니다.' */
export function spanSentence(dates: string[], count: number): string {
  const counted = count < 100 ? `문장 ${koreanCount(count)} 개` : `문장 ${count}개`;
  const valid = dates
    .map((d) => d.slice(0, 10))
    .filter((d) => parse(d))
    .sort();
  if (valid.length === 0) return `${counted}를 옮겨 적었습니다.`;
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (first === last) return `${fullMonthDay(first, false)}에 ${counted}를 옮겨 적었습니다.`;
  const crossYear = first.slice(0, 4) !== last.slice(0, 4);
  return `${fullMonthDay(first, crossYear)}부터 ${fullMonthDay(last, crossYear)}까지, ${counted}를 옮겨 적었습니다.`;
}
