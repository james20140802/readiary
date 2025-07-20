import {
  fetchFriendList,
  fetchReceivedFriendRequests,
  fetchSentFriendRequests,
} from '@/lib/friends/fetchFriendList';
import Link from 'next/link';
import FriendRequestForm from './_components/FriendRequestForm';
import FriendListItem from './_components/FriendListItem';
import AcceptFriendRequestButton from './_components/AcceptFriendRequestButton';
import DeclineFriendRequestButton from './_components/DeclineFriendRequestButton';
import CancelFriendRequestButton from './_components/CancelFriendRequestButton';

interface SocialPageProps {
  searchParams?: Promise<{ [tab: string]: string | undefined }>;
}

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const acceptedFriends = (await fetchFriendList()) ?? [];
  const pendingFriends = (await fetchReceivedFriendRequests()) ?? [];
  const sentFriends = (await fetchSentFriendRequests()) ?? [];

  const tabParam = (await searchParams)?.tab ?? 'friends';
  const currentTab = ['friends', 'pending', 'sent'].includes(tabParam) ? tabParam : 'friends';

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">👥 친구 관리</h1>
      <FriendRequestForm />

      <nav className="flex justify-center space-x-4 border-b border-gray-300 dark:border-gray-700 mb-6">
        <Link
          href="/protected/social?tab=friends"
          className={`px-4 py-2 -mb-px border-b-2 font-semibold ${
            currentTab === 'friends'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          📋 친구 목록
        </Link>
        <Link
          href="/protected/social?tab=pending"
          className={`px-4 py-2 -mb-px border-b-2 font-semibold ${
            currentTab === 'pending'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          ⏳ 신청 대기 중
        </Link>
        <Link
          href="/protected/social?tab=sent"
          className={`px-4 py-2 -mb-px border-b-2 font-semibold ${
            currentTab === 'sent'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          📤 보낸 요청
        </Link>
      </nav>

      {currentTab === 'friends' && (
        <section>
          {acceptedFriends.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">아직 친구가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {acceptedFriends.map((friend) => (
                <FriendListItem
                  key={friend.profile.id}
                  profile={friend.profile}
                  href={`/protected/social/${friend.profile.nickname}-${friend.profile.tag}`}
                  action={null}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {currentTab === 'pending' && (
        <section>
          {pendingFriends.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">신청 중인 친구가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {pendingFriends.map((friend) => (
                <FriendListItem
                  key={friend.profile.id}
                  profile={friend.profile}
                  href={undefined}
                  action={
                    <div className="flex gap-2 ml-auto">
                      <AcceptFriendRequestButton friendUserId={friend.profile.id} />
                      <DeclineFriendRequestButton friendUserId={friend.profile.id} />
                    </div>
                  }
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {currentTab === 'sent' && (
        <section>
          {sentFriends.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">보낸 친구 요청이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {sentFriends.map((friend) => (
                <FriendListItem
                  key={friend.profile.id}
                  profile={friend.profile}
                  href={undefined}
                  action={<CancelFriendRequestButton friendUserId={friend.profile.id} />}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
