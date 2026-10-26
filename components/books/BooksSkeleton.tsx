'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import { todayKST } from '@/lib/dates';
import type { MyBook } from '@/types/book';
import type { BookReadingStat } from '@/lib/queries/fetchBookReadingStats';
import BooksView from './BooksView';

function book(i: number, finished: boolean, lastReadPage: number | null): MyBook {
  return {
    id: `skeleton-${i}`,
    book_id: `skeleton-${i}`,
    progress: null,
    created_at: '2026-09-01T09:00:00+09:00',
    is_finished: finished,
    last_read_page: lastReadPage,
    books: {
      id: `skeleton-${i}`,
      title: filler(8),
      author: filler(5),
      total_pages: 320,
      cover_url: null,
    },
  };
}

const READING: MyBook[] = [book(0, false, 184), book(1, false, 42), book(2, false, null)];
const FINISHED: MyBook[] = [3, 4, 5, 6, 7, 8].map((i) => book(i, true, 320));
const BOOKS: MyBook[] = [...READING, ...FINISHED];

const STATS: Record<string, BookReadingStat> = {};
BOOKS.forEach((b, i) => {
  STATS[b.id] = { firstDate: '2026-09-01', lastDate: '2026-09-20', entryCount: 3 + (i % 5) };
});

/** 책장을 불러오는 동안 — 실제 BooksView를 자리용 책들로 그린다 */
export default function BooksSkeleton() {
  return (
    <SkeletonScope label="책장을 펼치는 중">
      <BooksView books={BOOKS} stats={STATS} today={todayKST()} />
    </SkeletonScope>
  );
}
