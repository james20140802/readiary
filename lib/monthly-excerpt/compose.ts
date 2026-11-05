import type { Candidate, ExcerptItem } from './types';

export interface ExcerptPick {
  entryId: string;
  quote: string;
  date: string;
  bookTitle: string;
  isPrivate: boolean;
  hasNote: boolean;
}

/** 엮기 화면이 들고 있는 고른 문장 — 미리보기가 후보 목록 없이도 한 페이지를 그리도록 필요한 값을 함께 담는다. */
export interface ComposePick extends ExcerptPick {
  note: string | null;
  fromPage: number | null;
  toPage: number | null;
  bookId: string;
  author: string | null;
}

/**
 * 후보 → 고른 문장. 후보 응답에 생각 본문·책 정보가 없던 옛 형태(마이그레이션 적용 전)도 읽을 수 있게
 * 없는 값은 비워 둔다. 책 id가 없으면 user_book id로 대신해 책 수 세기가 어긋나지 않게 한다.
 */
export function pickFromCandidate(c: Candidate): ComposePick {
  return {
    entryId: c.entryId,
    quote: c.quote,
    date: c.date,
    bookTitle: c.bookTitle,
    isPrivate: c.isPrivate,
    hasNote: c.hasNote,
    note: c.note ?? null,
    fromPage: c.fromPage,
    toPage: c.toPage,
    bookId: c.bookId ?? c.userBookId,
    author: c.author ?? null,
  };
}

/** 이미 엮은 발췌집의 항목 → 고른 문장 (고치기의 시작 상태) */
export function pickFromItem(item: ExcerptItem): ComposePick {
  return {
    entryId: item.entryId,
    quote: item.quote,
    date: item.date,
    bookTitle: item.book.title,
    isPrivate: Boolean(item.isPrivate),
    hasNote: Boolean(item.note),
    note: item.note,
    fromPage: item.fromPage,
    toPage: item.toPage,
    bookId: item.book.id,
    author: item.book.author,
  };
}

/** 고른 문장 → 읽는 화면이 그리는 항목. 고른 순서가 곧 순서 번호다. */
export function itemsFromPicks(picks: ComposePick[]): ExcerptItem[] {
  return picks.map((p, i) => ({
    position: i,
    entryId: p.entryId,
    date: p.date,
    quote: p.quote,
    note: p.note,
    isPrivate: p.isPrivate,
    fromPage: p.fromPage,
    toPage: p.toPage,
    book: { id: p.bookId, title: p.bookTitle, author: p.author },
  }));
}

/** 이미 골랐으면 빼고, 아니면 끝에 더한다. */
export function togglePick<T extends ExcerptPick>(picks: T[], c: T): T[] {
  return picks.some((p) => p.entryId === c.entryId)
    ? picks.filter((p) => p.entryId !== c.entryId)
    : [...picks, c];
}

/** from 자리의 항목을 to 자리로 옮긴다. 범위 밖이면 그대로. */
export function reorderPick<T extends ExcerptPick>(picks: T[], from: number, to: number): T[] {
  if (from < 0 || from >= picks.length || to < 0 || to >= picks.length || from === to) {
    return picks;
  }
  const next = [...picks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** id의 항목을 한 칸 위(-1) 또는 아래(1)로. 끝이거나 없는 id면 그대로. */
export function movePick<T extends ExcerptPick>(picks: T[], id: string, delta: -1 | 1): T[] {
  const from = picks.findIndex((p) => p.entryId === id);
  if (from < 0) return picks;
  return reorderPick(picks, from, from + delta);
}

/** 저장 시 사라진 기록(stale_entries)을 빼고 나머지 순서를 유지한다. */
export function reconcilePicks<T extends ExcerptPick>(picks: T[], staleIds: string[]): T[] {
  if (staleIds.length === 0) return picks;
  const stale = new Set(staleIds);
  return picks.filter((p) => !stale.has(p.entryId));
}
