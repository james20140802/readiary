import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { RecentEntry } from '@/lib/dashboard/fetchRecentEntries';

/** get_dashboard_core가 돌려주는 최근 기록 상한(limit 6). 이만큼 차 있으면 더 오래된 기록은 모른다 */
export const RECENT_ENTRIES_LIMIT = 6;

/** 오늘 장 머리의 큰 날짜 — KST 날짜 문자열에서만 만든다(시간대를 타지 않게) */
export function todayHeading(todayKst: string): { day: string; month: string; weekday: string } {
  const d = parseISO(todayKst);
  return {
    day: String(d.getDate()),
    month: `${d.getMonth() + 1}월`,
    weekday: format(d, 'EEEE', { locale: ko }),
  };
}

const ORDINALS = [
  '첫',
  '두 번째',
  '세 번째',
  '네 번째',
  '다섯 번째',
  '여섯 번째',
  '일곱 번째',
  '여덟 번째',
  '아홉 번째',
  '열 번째',
];

/** 이번 주에 지금 남길 문장이 몇 번째인지 — 경쟁이 아니라 오늘의 자리를 알려 주는 한 줄 */
export function weekOrdinal(weeklyCount: number): string {
  const n = Math.max(0, weeklyCount) + 1;
  const word = ORDINALS[n - 1] ?? `${n}번째`;
  return `이번 주 ${word} 문장`;
}

function monthDay(date: string, todayKst: string): string {
  const d = parseISO(date);
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return d.getFullYear() === parseISO(todayKst).getFullYear() ? md : `${d.getFullYear()}년 ${md}`;
}

/** 회상 간지 머리 — "20일 전 · 9월 16일", "1년 전 오늘 · 2025년 10월 6일" */
export function recallKicker(
  recall: { date: string; yearsAgo: number | null },
  todayKst: string
): string {
  const when = monthDay(recall.date, todayKst);
  if (recall.yearsAgo != null) return `${recall.yearsAgo}년 전 오늘 · ${when}`;
  const days = differenceInCalendarDays(parseISO(todayKst), parseISO(recall.date));
  let ago: string;
  if (days >= 365) ago = `${Math.floor(days / 365)}년 전`;
  else if (days >= 60) ago = `${Math.floor(days / 30)}달 전`;
  else if (days >= 1) ago = `${days}일 전`;
  else ago = '오늘';
  return `${ago} · ${when}`;
}

/** 읽기 진도를 잉크 분수로 — "184 / 352". 쪽 정보가 없으면 진행률, 그것도 없으면 그리지 않는다 */
export function readingFraction(b: {
  last_read_page: number | null;
  progress: number | null;
  total: number | null;
}): { now: string; of: string } | null {
  if (b.last_read_page != null) {
    return b.total
      ? { now: String(b.last_read_page), of: `/ ${b.total}` }
      : { now: String(b.last_read_page), of: '쪽' };
  }
  if (b.progress != null) return { now: String(b.progress), of: '%' };
  return null;
}

export type WeekDiaryRow =
  | {
      kind: 'day';
      date: string;
      /** "오늘" 또는 요일 한 글자 */
      label: string;
      /** "10.4" */
      short: string;
      entry: RecentEntry;
      text: string;
      /** 같은 날 더 남긴 장 수. 상한에 걸려 정확히 모르면 null */
      more: number | null;
    }
  | { kind: 'rest'; from: string; to: string; label: string };

const shortDate = (date: string) => {
  const d = parseISO(date);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

/**
 * 지난 7일의 일기 — 최근 기록(상한 6개)을 날짜별 한 줄로 묶는다. 최신 날부터.
 * 최근 기록은 날짜순이 아니라 남긴 순서로 상한만큼 가져오므로(소급해 쓴 기록이 밀어낼 수 있다),
 * 상한이 차 있으면 어느 날이 비었는지도, 그날 몇 장인지도 알 수 없다. 그때는 쉰 날 줄과 "외 N장"을 그리지 않는다.
 * 상한 아래일 때만 쉰 날을 이어진 만큼 한 줄로 접는다. 오늘이 비어 있으면 줄을 만들지 않는다.
 */
export function buildWeekDiary(entries: RecentEntry[], todayKst: string): WeekDiaryRow[] {
  const today = parseISO(todayKst);
  const windowStart = format(addDays(today, -6), 'yyyy-MM-dd');
  const usable = entries.filter((e) => (e.quote ?? e.note) != null);
  const full = entries.length >= RECENT_ENTRIES_LIMIT;

  const byDate = new Map<string, RecentEntry[]>();
  for (const e of usable) {
    if (e.date < windowStart || e.date > todayKst) continue;
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  if (byDate.size === 0) return [];

  const rows: WeekDiaryRow[] = [];
  let rest: { from: string; to: string } | null = null;
  const flushRest = () => {
    if (!rest) return;
    const label =
      rest.from === rest.to
        ? shortDate(rest.from)
        : `${shortDate(rest.from)} – ${shortDate(rest.to)}`;
    rows.push({ kind: 'rest', ...rest, label });
    rest = null;
  };

  for (let i = 0; i < 7; i++) {
    const date = format(addDays(today, -i), 'yyyy-MM-dd');
    const list = byDate.get(date);
    if (!list) {
      if (i === 0 || full) continue;
      rest = rest ? { from: date, to: rest.to } : { from: date, to: date };
      continue;
    }
    flushRest();
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = sorted[0];
    rows.push({
      kind: 'day',
      date,
      label: i === 0 ? '오늘' : format(parseISO(date), 'EEEEE', { locale: ko }),
      short: shortDate(date),
      entry: latest,
      text: (latest.quote ?? latest.note) as string,
      more: full ? null : sorted.length - 1,
    });
  }
  flushRest();
  return rows;
}
