import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
// app/(app)/social/friends/page.tsx
import {
  fetchFriendList,
  fetchReceivedFriendRequests,
  fetchSentFriendRequests,
} from '@/lib/friends/fetchFriendList';
import { slugToSearchQuery } from '@/lib/social/invite';
import FriendsView, { type FriendsTabValue } from '@/components/social/friends/FriendsView';

interface FriendsPageProps {
  searchParams: Promise<{ invite?: string; tab?: string }>;
}

export default async function FriendsPage({ searchParams }: FriendsPageProps) {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) return null;

  const { invite, tab } = await searchParams;
  const initialInviteQuery = invite ? (slugToSearchQuery(invite) ?? undefined) : undefined;
  const initialTab: FriendsTabValue = tab === 'pending' || tab === 'sent' ? tab : 'friends';

  const supabase = await createSupabaseServerClient();
  const [acceptedFriends, pendingFriends, sentFriends, { data: me }] = await Promise.all([
    fetchFriendList(),
    fetchReceivedFriendRequests(),
    fetchSentFriendRequests(),
    // 초대 간지에 적을 내 닉네임#태그 — 내 프로필 한 줄만 읽는다(RLS 그대로)
    supabase.from('profiles').select('nickname, tag').eq('id', user.id).maybeSingle(),
  ]);

  return (
    <FriendsView
      acceptedFriends={acceptedFriends ?? []}
      pendingFriends={pendingFriends ?? []}
      sentFriends={sentFriends ?? []}
      initialTab={initialTab}
      initialInviteQuery={initialInviteQuery}
      me={me?.nickname && me.tag ? { nickname: me.nickname, tag: me.tag } : null}
    />
  );
}
