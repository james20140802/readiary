import type { ExcerptPick } from './compose';
import { koreanCount } from './korean-count';
import type { ExcerptItem, YearRow } from './types';

/** 우리말 셈 + 단위. 100부터는 숫자에 단위를 붙여 쓴다. */
function counted(n: number, unit: string): string {
  return n >= 100 ? `${n}${unit}` : `${koreanCount(n)} ${unit}`;
}

/** '네 권의 책에서 문장 열두 개를 골랐습니다.' */
export function titlePageSentence(items: ExcerptItem[], ownerName?: string): string {
  const books = new Set(items.map((i) => i.book.id)).size;
  const body = `${counted(books, '권')}의 책에서 문장 ${counted(items.length, '개')}를 골랐습니다.`;
  return ownerName ? `${ownerName}가 ${body}` : body;
}

/** 책별 문장 수. 많은 순, 같으면 먼저 나온 순. */
export function bookTally(items: ExcerptItem[]): { title: string; count: number }[] {
  const byBook = new Map<string, { title: string; count: number }>();
  for (const i of items) {
    const row = byBook.get(i.book.id);
    if (row) row.count += 1;
    else byBook.set(i.book.id, { title: i.book.title, count: 1 });
  }
  // Array.sort는 안정 정렬이라 같은 수는 먼저 나온 순이 유지된다.
  return [...byBook.values()].sort((a, b) => b.count - a.count);
}

/** 표시용: max권까지 보이고 나머지는 '외 N권' 한 줄로 묶는다. */
export function bookTallyForDisplay(
  items: ExcerptItem[],
  max = 2
): { title: string; count: number }[] {
  const tally = bookTally(items);
  if (tally.length <= max) return tally;
  const rest = tally.slice(max);
  return [
    ...tally.slice(0, max),
    { title: `외 ${rest.length}권`, count: rest.reduce((sum, r) => sum + r.count, 0) },
  ];
}

/** 친구에게 보여 줄 때 달라지는 점. noteCount는 공개 항목 중 생각이 있는 수만 센다. */
export function shareImpact(picks: ExcerptPick[]): {
  privateCount: number;
  noteCount: number;
  publicCount: number;
  lines: string[];
} {
  const pub = picks.filter((p) => !p.isPrivate);
  const privateCount = picks.length - pub.length;
  const noteCount = pub.filter((p) => p.hasNote).length;
  const lines: string[] = [];
  if (noteCount > 0) lines.push(`생각 ${noteCount}개도 함께 보여요`);
  if (privateCount > 0) lines.push(`문장 ${privateCount}개는 친구에게 보이지 않아요`);
  return { privateCount, noteCount, publicCount: pub.length, lines };
}

/**
 * 책장의 '달의 발췌집 N권 · 모두 보기' 한 줄에 쓸 값. 엮은 것이 없고 엮을 달도 없으면 줄을 두지 않는다(null).
 * 해 목록 하나로 권수와 엮을 달을 함께 얻는다.
 */
export interface ShelfExcerptLine {
  count: number;
  hasUnmade: boolean;
}

export function shelfExcerptLine(years: YearRow[]): ShelfExcerptLine | null {
  const count = years.reduce((sum, y) => sum + y.excerptCount, 0);
  const hasUnmade = years.some((y) => y.hasUnmade);
  return count === 0 && !hasUnmade ? null : { count, hasUnmade };
}
