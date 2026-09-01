'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import FriendRequestForm from './FriendRequestForm';
import FriendListItem from './FriendListItem';
import AcceptFriendRequestButton from './AcceptFriendRequestButton';
import DeclineFriendRequestButton from './DeclineFriendRequestButton';
import CancelFriendRequestButton from './CancelFriendRequestButton';
import { Friend } from '@/types/friends';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Users } from 'lucide-react';

export type FriendsTabValue = 'friends' | 'pending' | 'sent';

interface Props {
  acceptedFriends: Friend[];
  pendingFriends: Friend[];
  sentFriends: Friend[];
  initialTab?: FriendsTabValue;
  initialInviteQuery?: string;
}

export default function FriendsManager({
  acceptedFriends,
  pendingFriends,
  sentFriends,
  initialTab = 'friends',
  initialInviteQuery,
}: Props) {
  const [friendTab, setFriendTab] = useState<FriendsTabValue>(initialTab);
  const isMobile = useIsMobile();

  const friendTabs = [
    { label: '목록', value: 'friends' },
    { label: '받은 요청', value: 'pending' },
    { label: '보낸 요청', value: 'sent' },
  ];

  return (
    <div className="space-y-6">
      <FriendRequestForm initialQuery={initialInviteQuery} />

      <div className="space-y-1">
        <Tabs
          tabs={friendTabs}
          defaultValue={friendTab}
          onChange={(id) => setFriendTab(id as FriendsTabValue)}
          fullWidth={isMobile}
        />

        <div>
          {/* 친구 목록 */}
          {friendTab === 'friends' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {acceptedFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Users size={28} className="text-ink-faint" />
                  <p className="text-body-sm text-ink-faint">아직 친구가 없어요</p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline">
                  {acceptedFriends.map((friend) => (
                    <li key={friend.profile.id}>
                      <FriendListItem
                        profile={friend.profile}
                        href={`/protected/social/u/${friend.profile.nickname}-${friend.profile.tag}`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* 받은 요청 */}
          {friendTab === 'pending' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {pendingFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-body-sm text-ink-faint">받은 친구 요청이 없어요</p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline">
                  {pendingFriends.map((friend) => (
                    <li key={friend.profile.id}>
                      <FriendListItem
                        profile={friend.profile}
                        href={undefined}
                        action={
                          <div className="flex gap-1">
                            <AcceptFriendRequestButton friendUserId={friend.profile.id} />
                            <DeclineFriendRequestButton friendUserId={friend.profile.id} />
                          </div>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* 보낸 요청 */}
          {friendTab === 'sent' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {sentFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-body-sm text-ink-faint">보낸 친구 요청이 없어요</p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline">
                  {sentFriends.map((friend) => (
                    <li key={friend.profile.id}>
                      <FriendListItem
                        profile={friend.profile}
                        href={undefined}
                        action={<CancelFriendRequestButton friendUserId={friend.profile.id} />}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
