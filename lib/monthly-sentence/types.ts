import type { MonthKey } from '@/lib/monthly-excerpt/types';

/** 고르지 않은 달을 채우는 자동 기준. 일기장 전체에 하나다. */
export type SentenceRule = 'likes' | 'reflections' | 'recent';

/** 그 달의 문장이 정해진 방식: 내가 고름 → 달의 발췌집 표지 → 자동 기준. */
export type SentenceSource = 'picked' | 'excerpt' | 'auto';

/** 내 화면의 한 달. 문장이 없는 달은 entryId가 null이다(쉬어 간 달·생각만 남긴 달). */
export interface OwnSentenceRow {
  month: MonthKey;
  entryId: string | null;
  quote: string | null;
  bookTitle: string | null;
  fromPage: number | null;
  toPage: number | null;
  source: SentenceSource | null;
  entryCount: number;
  isPrivate: boolean;
  /** 나만 보기 문장을 고른 달만: 친구에게 다른 문장이 보이는지('other'), 달이 안 보이는지('none') */
  friendFallback: 'other' | 'none' | null;
  /** 'made' 엮은 달 · 'unmade' 끝난 달인데 아직 안 엮음 · 'none' */
  excerpt: 'none' | 'unmade' | 'made';
}

/** 친구 화면의 한 달. 공개 기록에서 나온 값만 있다. */
export interface FriendSentenceRow {
  month: MonthKey;
  entryId: string;
  quote: string;
  bookTitle: string | null;
  fromPage: number | null;
  toPage: number | null;
  hasExcerpt: boolean;
}

export interface OwnSentences {
  mode: 'own';
  rule: SentenceRule;
  reflectionsOn: boolean;
  rows: OwnSentenceRow[];
  nextBefore: MonthKey | null;
}

export interface FriendSentences {
  mode: 'friend';
  hasAnyExcerpt: boolean;
  rows: FriendSentenceRow[];
  nextBefore: MonthKey | null;
}

export interface SentenceCandidate {
  entryId: string;
  quote: string;
  bookTitle: string | null;
  /** yyyy-MM-dd */
  date: string;
  isPrivate: boolean;
}

export interface SentenceCandidates {
  pickedEntryId: string | null;
  publicCount: number;
  total: number;
  items: SentenceCandidate[];
}
