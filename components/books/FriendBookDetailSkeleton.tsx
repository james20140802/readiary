'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { Book, MyBook } from '@/types/book';
import type { EntryDetailData } from '@/types/entry';
import type { Profile } from '@/types/profile';
import FriendProfileHeader from '@/components/social/FriendProfileHeader';
import BookDetailContent from './BookDetailContent';

const PROFILE: Profile = {
  id: 'skeleton-friend',
  name: filler(2),
  nickname: 'skeleton',
  tag: '0000',
  bio: null,
  created_at: null,
  profile_image: null,
};

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

const DATES = ['2026-09-29', '2026-09-30', '2026-10-05'];
const QUOTE_LENS = [30, 22, 26];

const ENTRIES: EntryDetailData[] = DATES.map((date, i) => ({
  entry: {
    id: `skeleton-entry-${i}`,
    date,
    quote: filler(QUOTE_LENS[i]),
    note: null,
    from_page: 20 + i * 40,
    to_page: null,
    is_private: false,
    book: BOOK,
    created_at: `${date}T12:00:00+09:00`,
    reflectionSummary: null,
  },
  userId: 'skeleton-user',
  initialLiked: false,
  initialLikeCount: 1,
  initialCommentCount: 0,
}));

/** 친구의 책 한 권을 불러오는 동안 — 실제 BookDetailContent를 친구 책장 모드로 자리용 기록에 그린다 */
export default function FriendBookDetailSkeleton() {
  return (
    <SkeletonScope label="친구의 책을 펼치는 중">
      <FriendProfileHeader profile={PROFILE} title={BOOK.title} />
      <div className="mt-6">
        <BookDetailContent
          userBook={USER_BOOK}
          userId="skeleton-user"
          entries={ENTRIES}
          friendProfile={PROFILE}
          isFriend
        />
      </div>
    </SkeletonScope>
  );
}
