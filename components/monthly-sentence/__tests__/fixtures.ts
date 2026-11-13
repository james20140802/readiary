import type { OwnSentenceRow, OwnSentences, SentenceCandidate } from '@/lib/monthly-sentence/types';

export function ownRow(month: string, over: Partial<OwnSentenceRow> = {}): OwnSentenceRow {
  return {
    month,
    entryId: `e-${month}`,
    quote: `${month}의 문장`,
    bookTitle: '아무튼, 메모',
    fromPage: null,
    toPage: null,
    source: 'auto',
    entryCount: 4,
    isPrivate: false,
    friendFallback: null,
    excerpt: 'none',
    ...over,
  };
}

/** 2026-11부터 거슬러 올라가는 n달 */
export function months(n: number, from = 11): string[] {
  return Array.from({ length: n }, (_, i) => {
    const index = 2026 * 12 + (from - 1) - i;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
  });
}

export function own(over: Partial<OwnSentences> = {}): OwnSentences {
  return {
    mode: 'own',
    rule: 'likes',
    reflectionsOn: true,
    rows: months(6).map((m) => ownRow(m)),
    nextBefore: null,
    ...over,
  };
}

export function candidate(n: number, over: Partial<SentenceCandidate> = {}): SentenceCandidate {
  return {
    entryId: `c${n}`,
    quote: `후보 ${n}`,
    bookTitle: '책',
    date: `2026-11-${String(n).padStart(2, '0')}`,
    isPrivate: false,
    ...over,
  };
}

/** apiFetch가 돌려줄 Response 흉내 */
export function res(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as unknown as Response;
}
