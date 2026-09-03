import { formatReadingPeriod } from '@/lib/dates';
import type { BookReadingStat } from '@/lib/queries/fetchBookReadingStats';
import type { ShelfBook } from '@/components/books/BookSpineShelf';

/**
 * 프로필에 꽂는 최대 권수 — 그 이상은 "책장 전체 →".
 * 서버 컴포넌트가 읽는 값이라 'use client' 파일에 두지 않는다(클라이언트 참조가 되어 숫자가 아니게 된다).
 */
export const PROFILE_SHELF_LIMIT = 12;

/** 책장에 꽂을 수 있는 최소한의 user_book 모양 — MyBook과 UserBookWithCover 둘 다 맞는다 */
export interface ShelfSource {
  id: string;
  last_read_page: number | null;
  is_finished: boolean | null;
  books: {
    title: string | null;
    author: string | null;
    total_pages: number | null;
    cover_url?: string | null;
  };
}

/**
 * user_book 한 행을 책등 책장이 읽는 모양으로 접는다.
 * stats가 null이면(친구 책장·조회 실패) 통계는 "모름" — 0(기록 없음)과 구분해 null로 둔다.
 */
export function toShelfBook(
  ub: ShelfSource,
  stats: Record<string, BookReadingStat> | null | undefined,
  href: string
): ShelfBook {
  const stat = stats?.[ub.id];
  return {
    id: ub.id,
    title: ub.books.title ?? '(제목 없음)',
    author: ub.books.author,
    coverUrl: ub.books.cover_url ?? null,
    totalPages: ub.books.total_pages,
    lastReadPage: ub.last_read_page,
    isFinished: ub.is_finished ?? false,
    href,
    readingPeriod: stat ? formatReadingPeriod([stat.firstDate, stat.lastDate]) : null,
    entryCount: stats ? (stat?.entryCount ?? 0) : null,
  };
}
