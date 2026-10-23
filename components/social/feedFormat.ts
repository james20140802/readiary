import { toKSTDateString } from '@/lib/dates';
import type { Book } from '@/types/book';
import type { DetailSocialFeedEntry } from '@/types/entry';
import type { Profile } from '@/types/profile';

/** 'YYYY-MM-DD' 두 날짜 사이의 날 수 — 문자열 날짜만 비교해 시간대를 타지 않는다 */
function daysBetween(fromDay: string, toDay: string): number {
  const ms = Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** 한국 시간 날짜로 몇 날 전인지 — 오늘 0, 어제 1 */
function kstDaysAgo(iso: string, now: Date): number {
  return daysBetween(toKSTDateString(new Date(iso)), toKSTDateString(now));
}

/** 피드·서재에 쓰는 짧은 날 표시: 오늘 · 어제 · 3일 전 · 10월 16일 · 2025년 12월 30일 */
export function dayLabel(iso: string, now: Date): string {
  const days = kstDaysAgo(iso, now);
  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  const [y, m, d] = toKSTDateString(new Date(iso)).split('-').map(Number);
  const [thisYear] = toKSTDateString(now).split('-').map(Number);
  return y === thisYear ? `${m}월 ${d}일` : `${y}년 ${m}월 ${d}일`;
}

/** 'p.42' · 'p.42–45' — 시작·끝이 같거나 한쪽만 있으면 한 번만 적는다 */
export function pageLabel(from: number | null, to: number | null): string | null {
  if (from == null && to == null) return null;
  if (from == null || to == null || from === to) return `p.${from ?? to}`;
  return `p.${from}–${to}`;
}

export interface FriendReading {
  profile: Profile;
  book: Book;
  /** '42쪽' 또는 남긴 날 */
  label: string;
}

/**
 * 친구들이 읽는 책 — 따로 조회하지 않고, 이미 받은 피드(최신순)에서 친구마다 가장 최근 기록의 책을 고른다.
 * 친구에게 보이는 기록만 피드에 오므로 공개 범위도 피드와 같다.
 */
export function friendsReadingFrom(
  items: DetailSocialFeedEntry[],
  now: Date,
  limit = 12
): FriendReading[] {
  const seen = new Set<string>();
  const list: FriendReading[] = [];
  for (const { profile, entry } of items) {
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    const page = entry.to_page ?? entry.from_page;
    list.push({
      profile,
      book: entry.book,
      label: page != null ? `${page}쪽` : dayLabel(entry.created_at, now),
    });
    if (list.length >= limit) break;
  }
  return list;
}

export interface DayGroup<T> {
  label: '오늘' | '이번 주' | '이전';
  rows: T[];
}

/** 최신순 목록을 오늘(한국 시간) · 이번 주(1~6일 전) · 이전으로 묶는다. 빈 묶음은 만들지 않는다 */
export function groupByDay<T extends { createdAt: string }>(rows: T[], now: Date): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const row of rows) {
    const days = kstDaysAgo(row.createdAt, now);
    const label = days <= 0 ? '오늘' : days < 7 ? '이번 주' : '이전';
    const last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }
  return groups;
}
