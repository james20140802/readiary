import { formatPages } from '@/lib/entries/pages';
import type { MonthKey } from '@/lib/monthly-excerpt/types';
import type { FriendSentenceRow, OwnSentenceRow, SentenceCandidate, SentenceRule } from './types';

/** 일기장에 보이는 범위 — 이번 달 포함 최근 24개월. DB의 바닥과 같다. */
const WINDOW_MONTHS = 24;

/** 그 달이 일기장에 보이는 범위 안인가. todayKst는 'YYYY-MM-DD'. */
export function isInSentenceWindow(month: MonthKey, todayKst: string): boolean {
  const index = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7));
  const diff = index(todayKst) - index(month);
  return diff >= 0 && diff < WINDOW_MONTHS;
}

/** 한 번에 보이는 줄 수. 더 보기도 이만큼씩 연다. */
export const SENTENCE_PAGE_SIZE = 6;

export const RULES: readonly SentenceRule[] = ['likes', 'reflections', 'recent'];

const RULE_LABELS: Record<SentenceRule, string> = {
  likes: '좋아요 많은 문장',
  reflections: '생각 많은 문장',
  recent: '최근 문장',
};

export function isSentenceRule(value: unknown): value is SentenceRule {
  return typeof value === 'string' && (RULES as readonly string[]).includes(value);
}

export function ruleLabel(rule: SentenceRule): string {
  return RULE_LABELS[rule];
}

export function ruleSentence(rule: SentenceRule): string {
  return `고르지 않은 달은 ${ruleLabel(rule)}으로`;
}

/** 이어 남긴 생각이 꺼져 있으면 그 기준은 고를 수 없다. */
export function availableRules(reflectionsOn: boolean): SentenceRule[] {
  return RULES.filter((rule) => reflectionsOn || rule !== 'reflections');
}

/** 저장된 기준이 지금 실제로 적용되는 기준 — DB의 계산과 같다. */
export function shownRule(rule: SentenceRule, reflectionsOn: boolean): SentenceRule {
  return rule === 'reflections' && !reflectionsOn ? 'recent' : rule;
}

/** '2026-09' → '9' */
export function monthNumber(month: MonthKey): string {
  return String(Number(month.split('-')[1]));
}

/** 첫 줄과 해가 바뀌는 줄에만 연도를 붙인다. */
export function yearLabels(months: MonthKey[]): (string | null)[] {
  return months.map((month, i) => {
    const year = month.slice(0, 4);
    return i === 0 || months[i - 1].slice(0, 4) !== year ? year : null;
  });
}

/** 문장이 없는 달에 문장 대신 보이는 말. */
export function placeholder(row: OwnSentenceRow): string | null {
  if (row.entryId) return null;
  return row.entryCount > 0 ? '생각만 남긴 달' : '쉬어 간 달';
}

const SOURCE_LABELS: Record<string, string> = {
  picked: '내가 고른 문장',
  excerpt: '발췌집 표지',
};

function sourceMeta(row: Pick<OwnSentenceRow, 'bookTitle' | 'fromPage' | 'toPage'>): string[] {
  return [row.bookTitle, formatPages(row.fromPage, row.toPage)].filter((v): v is string => !!v);
}

/** 내 화면의 메타: 책 제목, 쪽수, 정해진 방식, 그달의 기록 수. 없는 것은 자리를 비우지 않는다. */
export function ownMeta(row: OwnSentenceRow): string[] {
  const meta = sourceMeta(row);
  const source = row.source ? SOURCE_LABELS[row.source] : undefined;
  if (source) meta.push(source);
  if (row.entryCount > 0) meta.push(`기록 ${row.entryCount}`);
  return meta;
}

/** 친구 화면의 메타: 책 제목과 쪽수만. */
export function friendMeta(row: FriendSentenceRow): string[] {
  return sourceMeta(row);
}

export function fallbackNotice(fallback: 'other' | 'none' | null): string | null {
  if (fallback === 'other') return '나만 보여요 · 친구에게는 다른 문장이 보여요';
  if (fallback === 'none') return '나만 보여요 · 친구에게는 이 달이 보이지 않아요';
  return null;
}

/** 나만 보기 문장을 고르면 친구에게 어떻게 보일지 — 그달에 공개 문장이 있는지에 달렸다. */
export function pickNotice(
  candidate: Pick<SentenceCandidate, 'isPrivate'>,
  publicCount: number
): string | null {
  if (!candidate.isPrivate) return null;
  return fallbackNotice(publicCount > 0 ? 'other' : 'none');
}
