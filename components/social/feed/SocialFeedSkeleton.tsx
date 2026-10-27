'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { DetailSocialFeedEntry } from '@/types/entry';
import type { Friend } from '@/types/friends';
import type { Profile } from '@/types/profile';
import SocialFeedView from './SocialFeedView';

// 2026-10-23 10:00 KST 비슷한 고정 기준 시각 — 날 표시 계산만 쓰고 화면엔 막대로만 보인다
const REFERENCE_TIME = '2026-10-23T01:00:00.000Z';
const hoursAgo = (h: number) => new Date(Date.parse(REFERENCE_TIME) - h * 3_600_000).toISOString();

function person(id: string, nameLen: number): Profile {
  return {
    id,
    name: filler(nameLen),
    nickname: filler(5),
    tag: '0000',
    bio: null,
    created_at: '2026-01-04T00:00:00.000Z',
    profile_image: null,
  };
}

const P0 = person('skeleton-p0', 2);
const P1 = person('skeleton-p1', 2);
const P2 = person('skeleton-p2', 2);

function post(
  id: string,
  profile: Profile,
  e: { quote?: string; note?: string; page?: number | null; hours: number }
): DetailSocialFeedEntry {
  return {
    profile,
    entry: {
      id,
      date: hoursAgo(e.hours).slice(0, 10),
      quote: e.quote ?? null,
      note: e.note ?? null,
      from_page: e.page ?? null,
      to_page: e.page ?? null,
      is_private: false,
      book: {
        id: `skeleton-book-${id}`,
        title: filler(8),
        author: null,
        total_pages: 300,
        cover_url: null,
      },
      created_at: hoursAgo(e.hours),
      reflectionSummary: null,
    },
    initialLikeCount: 3,
    initialLiked: false,
    initialCommentCount: 1,
  };
}

const FEED: DetailSocialFeedEntry[] = [
  post('skeleton-e0', P0, { quote: filler(30), note: filler(40), page: 42, hours: 2 }),
  post('skeleton-e1', P1, { quote: filler(22), page: 118, hours: 20 }),
  post('skeleton-e2', P2, { note: filler(50), hours: 50 }),
];

const PENDING: Friend[] = [
  { profile: person('skeleton-pending', 2), accepted: false, isRecipient: true },
];

/** 친구의 문장을 불러오는 동안 — 실제 SocialFeedView를 자리용 데이터로 그린다 */
export default function SocialFeedSkeleton() {
  return (
    <SkeletonScope label="친구의 문장을 펼치는 중">
      <SocialFeedView
        initialFeed={FEED}
        userId="skeleton-user"
        referenceTime={REFERENCE_TIME}
        pendingFriends={PENDING}
        friendCount={4}
        pageSize={FEED.length}
      />
    </SkeletonScope>
  );
}
