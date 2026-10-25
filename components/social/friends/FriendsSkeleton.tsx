'use client';

import { SkeletonScope, filler } from '@/components/ui/Skeleton';
import type { Friend } from '@/types/friends';
import type { Profile } from '@/types/profile';
import FriendsView from './FriendsView';

function person(id: string): Profile {
  return {
    id,
    name: filler(2),
    nickname: filler(5),
    tag: '0000',
    bio: null,
    created_at: '2026-01-04T00:00:00.000Z',
    profile_image: null,
  };
}

const friend = (id: string): Friend => ({
  profile: person(id),
  accepted: true,
  isRecipient: false,
});

const ACCEPTED: Friend[] = [0, 1, 2, 3].map((i) => friend(`skeleton-friend-${i}`));
const PENDING: Friend[] = [
  { profile: person('skeleton-pending'), accepted: false, isRecipient: true },
];
const SENT: Friend[] = [{ profile: person('skeleton-sent'), accepted: false, isRecipient: false }];
const ME = { nickname: filler(5), tag: '0000' };

/** 친구를 불러오는 동안 — 실제 FriendsView를 자리용 데이터로 그린다 */
export default function FriendsSkeleton() {
  return (
    <SkeletonScope label="친구를 펼치는 중">
      <FriendsView
        acceptedFriends={ACCEPTED}
        pendingFriends={PENDING}
        sentFriends={SENT}
        initialTab="friends"
        me={ME}
      />
    </SkeletonScope>
  );
}
