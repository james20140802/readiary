'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import FriendProfileHeader from '@/components/social/FriendProfileHeader';
import type { Entry } from '@/types/entry';
import type { Book } from '@/types/book';
import type { Profile } from '@/types/profile';
import SocialActionBar from '@/components/social/SocialActionBar';
import EntryLayer from './EntryLayer';

const BOOK: Book = {
  id: 'skeleton-book',
  title: filler(8),
  author: filler(4),
  total_pages: null,
  cover_url: null,
  isbn: null,
};

const ENTRY: Entry = {
  id: 'skeleton-entry',
  date: '2026-10-16',
  quote: filler(30),
  note: filler(22),
  from_page: 10,
  to_page: 25,
  is_private: false,
  book: BOOK,
  created_at: '2026-10-16T09:00:00+09:00',
};

const FRIEND_PROFILE: Profile = {
  id: 'skeleton-friend',
  name: filler(3),
  nickname: filler(6),
  tag: '0000',
  bio: null,
  created_at: null,
  profile_image: null,
};

const noop = () => {};

/**
 * 기록 한 장을 불러오는 동안 — 실제 EntryDetailContent가 그리는 EntryLayer를 자리용 데이터로 그린다.
 * 덧붙인 생각·댓글은 마운트 뒤 기록 id로 따로 불러오는 부품이라 그리지 않는다(가짜 id로 요청이 나가지 않게).
 * 실제 화면에서도 두 부분은 기록이 보인 뒤에 따로 채워진다.
 */
export default function EntryDetailSkeleton({ isFriend = false }: { isFriend?: boolean }) {
  const bookUrl = isFriend
    ? `/social/u/${FRIEND_PROFILE.nickname}-${FRIEND_PROFILE.tag}/books/${BOOK.id}`
    : `/books/${BOOK.id}`;
  return (
    <SkeletonScope label="기록을 펼치는 중">
      {isFriend && <FriendProfileHeader profile={FRIEND_PROFILE} title="기록" />}
      <div className={isFriend ? 'mt-6' : undefined}>
        <EntryLayer
          entry={ENTRY}
          book={BOOK}
          bookUrl={bookUrl}
          isFriend={isFriend}
          back={isFriend ? { href: bookUrl, label: '책' } : { href: '/today', label: '오늘' }}
          onShare={isFriend ? undefined : noop}
          onMore={isFriend ? undefined : noop}
          reactions={
            <div className="flex min-h-10 items-center">
              <SocialActionBar
                entryId={ENTRY.id}
                initialLikeCount={3}
                initialLiked={false}
                commentCount={2}
                onCommentClick={noop}
                border={false}
              />
            </div>
          }
        />
      </div>
    </SkeletonScope>
  );
}
