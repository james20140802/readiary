import {
  fetchFriendList,
  fetchReceivedFriendRequests,
  fetchSentFriendRequests,
} from '@/lib/friends/fetchFriendList';
import FriendRequestForm from './_components/FriendRequestForm';
import SocialTab from './_components/SocialTab';

export default async function SocialPage() {
  const acceptedFriends = (await fetchFriendList()) ?? [];
  const pendingFriends = (await fetchReceivedFriendRequests()) ?? [];
  const sentFriends = (await fetchSentFriendRequests()) ?? [];

  return (
    <div>
      <section className="space-y-4">
        <h1 className="text-page-title text-label dark:text-white">👥 친구 관리</h1>
        <FriendRequestForm />
        <SocialTab
          acceptedFriends={acceptedFriends}
          pendingFriends={pendingFriends}
          sentFriends={sentFriends}
        />
      </section>
    </div>
  );
}
