'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { MyBook } from '@/types/book';
import SocialTopBar from '@/components/social/SocialTopBar';
import { LargeTitle } from '@/components/shell/LargeTitle';
import BookList from './BookList';

const NAME = filler(2);

function book(i: number, finished: boolean): MyBook {
  return {
    id: `skeleton-${i}`,
    book_id: `skeleton-${i}`,
    progress: null,
    created_at: '2026-09-01T09:00:00+09:00',
    is_finished: finished,
    last_read_page: finished ? 320 : 120,
    books: {
      id: `skeleton-${i}`,
      title: filler(8),
      author: filler(5),
      total_pages: 320,
      cover_url: null,
    },
  };
}

const BOOKS: MyBook[] = [0, 1, 2, 3, 4, 5].map((i) => book(i, i >= 2));

/** 친구의 서가를 불러오는 동안 — 실제 BookList를 자리용 책들로 그린다(통계 없이, 친구 책장과 같다) */
export default function FriendBooksSkeleton() {
  return (
    <SkeletonScope label="친구의 서가를 펼치는 중">
      <SocialTopBar title={`${NAME}의 서가`} back={{ href: '/social', label: `${NAME}의 서재` }} />
      <LargeTitle>
        <span data-skeleton>{NAME}</span>의 서가
      </LargeTitle>
      <p className="mt-1 font-sans text-[15px] font-medium text-ink-sub">
        <span data-skeleton>{BOOKS.length}</span>권 · 친구에게 보이는 기록만 열려요
      </p>
      <div className="mt-6">
        <BookList books={BOOKS} isFriend nicknameAndTag="skeleton-0000" />
      </div>
    </SkeletonScope>
  );
}
