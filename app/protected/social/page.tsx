// app/protected/social/page.tsx
import { fetchDetailSocialFeedEntries } from '@/lib/queries/fetchSocialFeedEntries';
import {
  fetchFriendList,
  fetchReceivedFriendRequests,
  fetchSentFriendRequests,
} from '@/lib/friends/fetchFriendList';
import { FEED_PAGINATION_LIMIT } from '@/constants/social';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SocialTab from './_components/SocialTab';

export default async function SocialPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 피드 데이터와 친구 데이터를 병렬로 fetch
  const [feed, acceptedFriends, pendingFriends, sentFriends] = await Promise.all([
    fetchDetailSocialFeedEntries(0, FEED_PAGINATION_LIMIT),
    fetchFriendList(),
    fetchReceivedFriendRequests(),
    fetchSentFriendRequests(),
  ]);

  return (
    <div className="space-y-4">
      <header className="px-1">
        <h1 className="text-page-title text-label dark:text-label-invert">🌏 소셜</h1>
      </header>

      <SocialTab
        userId={user.id}
        initialFeed={feed}
        acceptedFriends={acceptedFriends ?? []}
        pendingFriends={pendingFriends ?? []}
        sentFriends={sentFriends ?? []}
      />
    </div>
  );
}
