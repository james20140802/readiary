import PushSeen from '@/components/PushSeen';
import { getServerUser } from '@/lib/supabase/getServerUser';
// app/(app)/social/(feed)/page.tsx
import { redirect } from 'next/navigation';
import { fetchDetailSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import { fetchFriendList, fetchReceivedFriendRequests } from '@/lib/friends/fetchFriendList';
import { FEED_PAGINATION_LIMIT } from '@/constants/social';
import SocialFeedView from '@/components/social/feed/SocialFeedView';

interface SocialPageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const { invite } = await searchParams;
  // 초대 링크는 친구 페이지가 담당한다
  if (invite) redirect(`/social/friends?invite=${encodeURIComponent(invite)}`);

  const {
    data: { user },
  } = await getServerUser();
  if (!user) return null;

  const [feed, acceptedFriends, pendingFriends] = await Promise.all([
    fetchDetailSocialFeedEntries(0, FEED_PAGINATION_LIMIT),
    fetchFriendList(),
    fetchReceivedFriendRequests(),
  ]);

  return (
    <>
      <PushSeen kind="friends" />
      <SocialFeedView
        initialFeed={feed}
        userId={user.id}
        referenceTime={new Date().toISOString()}
        pendingFriends={pendingFriends ?? []}
        friendCount={acceptedFriends?.length ?? 0}
        pageSize={FEED_PAGINATION_LIMIT}
        loadPage={fetchDetailSocialFeedEntries}
      />
    </>
  );
}
