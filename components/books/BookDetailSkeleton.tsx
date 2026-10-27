'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { Book, MyBook } from '@/types/book';
import type { EntryDetailData } from '@/types/entry';
import BookDetailContent from './BookDetailContent';

const BOOK: Book = {
  id: 'skeleton-book',
  title: filler(8),
  author: filler(5),
  total_pages: 320,
  cover_url: null,
  isbn: null,
};

const USER_BOOK: MyBook = {
  id: 'skeleton-ub',
  book_id: BOOK.id,
  progress: null,
  created_at: '2026-09-01T09:00:00+09:00',
  is_finished: false,
  last_read_page: 184,
  books: BOOK,
};

const DATES = ['2026-09-29', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-06'];
const QUOTE_LENS = [30, 22, 34, 18, 26];

const ENTRIES: EntryDetailData[] = DATES.map((date, i) => ({
  entry: {
    id: `skeleton-entry-${i}`,
    date,
    quote: filler(QUOTE_LENS[i]),
    note: i === 2 ? filler(20) : null,
    from_page: 20 + i * 30,
    to_page: null,
    is_private: false,
    book: BOOK,
    created_at: `${date}T12:00:00+09:00`,
    reflectionSummary:
      i === DATES.length - 1
        ? {
            total: 1,
            latest: {
              id: 'skeleton-reflection',
              body: filler(24),
              created_at: `${date}T13:00:00+09:00`,
              is_private: false,
            },
          }
        : null,
  },
  userId: 'skeleton-user',
  initialLiked: false,
  initialLikeCount: 1,
  initialCommentCount: 0,
}));

/** 책 한 권을 불러오는 동안 — 실제 BookDetailContent를 자리용 기록으로 그린다 */
export default function BookDetailSkeleton() {
  return (
    <SkeletonScope label="책을 펼치는 중">
      <BookDetailContent userBook={USER_BOOK} entries={ENTRIES} userId="skeleton-user" />
    </SkeletonScope>
  );
}
