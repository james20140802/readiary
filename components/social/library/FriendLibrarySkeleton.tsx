'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { ShelfBook } from '@/components/books/BookSpineShelf';
import type { Profile } from '@/types/profile';
import FriendLibraryView from './FriendLibraryView';

const PROFILE: Profile = {
  id: 'skeleton-friend',
  name: filler(2),
  nickname: filler(5),
  tag: '0000',
  bio: filler(24),
  created_at: '2026-01-04T00:00:00.000Z',
  profile_image: null,
};

const SHELF: ShelfBook[] = [0, 1, 2, 3, 4, 5].map((i) => ({
  id: `skeleton-shelf-${i}`,
  title: filler(8),
  author: null,
  coverUrl: null,
  totalPages: 300,
  lastReadPage: null,
  isFinished: i > 3,
  href: '#',
  readingPeriod: null,
  entryCount: null,
}));

/** 친구의 서재를 불러오는 동안 — 실제 FriendLibraryView를 자리용 데이터로 그린다 */
export default function FriendLibrarySkeleton() {
  return (
    <SkeletonScope label="서재를 펼치는 중">
      <FriendLibraryView
        profile={PROFILE}
        isOwn={false}
        stats={{ totalBooks: 18, totalEntries: 31, totalPages: 0, finishedBooks: 9 }}
        featuredQuote={{
          entryId: 'skeleton-featured',
          quote: filler(24),
          bookTitle: filler(8),
          author: null,
        }}
        current={{
          title: filler(8),
          coverUrl: null,
          lastReadPage: 42,
          totalPages: 280,
          href: '#',
        }}
        sentences={[0, 1, 2].map((i) => ({
          key: `skeleton-sentence-${i}`,
          quote: filler([30, 22, 34][i]),
          meta: filler(6),
          href: '#',
        }))}
        shelfBooks={SHELF}
        shelfTotal={SHELF.length}
        shelfHref="#"
        excerpts={[0, 1].map((i) => ({
          bookId: `skeleton-excerpt-${i}`,
          title: filler(8),
          coverUrl: null,
          quoteCount: 12,
          href: '#',
        }))}
      />
    </SkeletonScope>
  );
}
