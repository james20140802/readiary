// app/protected/social/friends/page.tsx
import {
  fetchFriendList,
  fetchReceivedFriendRequests,
  fetchSentFriendRequests,
} from '@/lib/friends/fetchFriendList';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { slugToSearchQuery } from '@/lib/social/invite';
import BackButton from '@/components/ui/BackButton';
import FriendsManager, { type FriendsTabValue } from '../_components/FriendsManager';

interface FriendsPageProps {
  searchParams: Promise<{ invite?: string; tab?: string }>;
}

export default async function FriendsPage({ searchParams }: FriendsPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { invite, tab } = await searchParams;
  const initialInviteQuery = invite ? (slugToSearchQuery(invite) ?? undefined) : undefined;
  const initialTab: FriendsTabValue = tab === 'pending' || tab === 'sent' ? tab : 'friends';

  const [acceptedFriends, pendingFriends, sentFriends] = await Promise.all([
    fetchFriendList(),
    fetchReceivedFriendRequests(),
    fetchSentFriendRequests(),
  ]);

  return (
    <div className="space-y-4">
      <header className="px-1 flex items-center gap-1">
        <BackButton />
        <h1 className="text-page-title text-ink">친구</h1>
      </header>

      <FriendsManager
        acceptedFriends={acceptedFriends ?? []}
        pendingFriends={pendingFriends ?? []}
        sentFriends={sentFriends ?? []}
        initialTab={initialTab}
        initialInviteQuery={initialInviteQuery}
      />
    </div>
  );
}
