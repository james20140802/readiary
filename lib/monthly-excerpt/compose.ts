export interface ExcerptPick {
  entryId: string;
  quote: string;
  date: string;
  bookTitle: string;
  isPrivate: boolean;
  hasNote: boolean;
}

/** 이미 골랐으면 빼고, 아니면 끝에 더한다. */
export function togglePick(picks: ExcerptPick[], c: ExcerptPick): ExcerptPick[] {
  return picks.some((p) => p.entryId === c.entryId)
    ? picks.filter((p) => p.entryId !== c.entryId)
    : [...picks, c];
}

/** from 자리의 항목을 to 자리로 옮긴다. 범위 밖이면 그대로. */
export function reorderPick(picks: ExcerptPick[], from: number, to: number): ExcerptPick[] {
  if (from < 0 || from >= picks.length || to < 0 || to >= picks.length || from === to) {
    return picks;
  }
  const next = [...picks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** id의 항목을 한 칸 위(-1) 또는 아래(1)로. 끝이거나 없는 id면 그대로. */
export function movePick(picks: ExcerptPick[], id: string, delta: -1 | 1): ExcerptPick[] {
  const from = picks.findIndex((p) => p.entryId === id);
  if (from < 0) return picks;
  return reorderPick(picks, from, from + delta);
}

/** 저장 시 사라진 기록(stale_entries)을 빼고 나머지 순서를 유지한다. */
export function reconcilePicks(picks: ExcerptPick[], staleIds: string[]): ExcerptPick[] {
  if (staleIds.length === 0) return picks;
  const stale = new Set(staleIds);
  return picks.filter((p) => !stale.has(p.entryId));
}
