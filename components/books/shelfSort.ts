/**
 * 책장 정리 — 서가의 순서 칩(최근 읽은 순·제목순·문장 많은 순)과 거르기(읽는 중만·다 읽은 책만),
 * 책장 첫 장의 "읽는 중"과 "다 읽은 책" 나누기. 이미 받은 책 목록과 통계만으로 계산한다(추가 조회 없음).
 */

export interface ShelfStat {
  firstDate: string;
  lastDate: string;
  entryCount: number;
}

export interface SortableBook {
  id: string;
  created_at: string | null;
  is_finished: boolean | null;
  books: { title: string | null };
}

export type ShelfOrder = 'recent' | 'title' | 'entries';
export type ShelfFilter = 'all' | 'reading' | 'finished';

/** 마지막으로 읽은(기록한) 날 — 기록이 없으면 등록한 날 */
export function lastTouched(b: SortableBook, stats?: Record<string, ShelfStat> | null): string {
  return stats?.[b.id]?.lastDate ?? (b.created_at ?? '').slice(0, 10);
}

function byRecent(stats?: Record<string, ShelfStat> | null) {
  return (a: SortableBook, b: SortableBook) =>
    lastTouched(b, stats).localeCompare(lastTouched(a, stats)) ||
    (b.created_at ?? '').localeCompare(a.created_at ?? '') ||
    a.id.localeCompare(b.id);
}

export function arrangeShelf<T extends SortableBook>(
  books: T[],
  order: ShelfOrder,
  filter: ShelfFilter,
  stats?: Record<string, ShelfStat> | null
): T[] {
  let list = books.filter((b) =>
    filter === 'reading' ? !b.is_finished : filter === 'finished' ? !!b.is_finished : true
  );
  list = [...list];
  if (order === 'title') {
    list.sort(
      (a, b) =>
        (a.books.title ?? '').localeCompare(b.books.title ?? '', 'ko') || a.id.localeCompare(b.id)
    );
  } else if (order === 'entries' && stats) {
    const recent = byRecent(stats);
    list.sort(
      (a, b) => (stats[b.id]?.entryCount ?? 0) - (stats[a.id]?.entryCount ?? 0) || recent(a, b)
    );
  } else {
    list.sort(byRecent(stats));
  }
  return list;
}

/** 책장 첫 장 — 읽는 중(최근 읽은 순)과 다 읽은 책(최근 순) */
export function splitShelf<T extends SortableBook>(
  books: T[],
  stats?: Record<string, ShelfStat> | null
): { reading: T[]; finished: T[] } {
  const sorted = [...books].sort(byRecent(stats));
  return {
    reading: sorted.filter((b) => !b.is_finished),
    finished: sorted.filter((b) => !!b.is_finished),
  };
}
