'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import FriendRequestForm from './FriendRequestForm';
import FriendListItem from './FriendListItem';
import FriendRequestActions from './FriendRequestActions';
import CancelFriendRequestButton from './CancelFriendRequestButton';
import { Friend } from '@/types/friends';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { Users } from 'lucide-react';
import { useFold } from '@/hooks/useFold';
import { FoldLi, FoldList } from '@/components/ui/FoldList';

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
  // 열어 둔 채 써도 새 친구 요청이 새로고침 없이 도착하도록
  useLiveRefresh();
  // 수락·거절·취소한 요청은 접히며 빠지고 아래 줄이 그만큼 올라온다
  const fold = useFold();

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
            <section>
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
            <section>
              <FoldList
                as="ul"
                className="divide-y divide-hairline"
                isEmpty={pendingFriends.length === 0}
                empty={
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <p className="text-body-sm text-ink-faint">받은 친구 요청이 없어요</p>
                  </div>
                }
              >
                {pendingFriends.map((friend) => (
                  <FoldLi key={friend.profile.id} {...fold}>
                    <FriendListItem
                      profile={friend.profile}
                      href={undefined}
                      action={<FriendRequestActions friendUserId={friend.profile.id} />}
                    />
                  </FoldLi>
                ))}
              </FoldList>
            </section>
          )}

          {/* 보낸 요청 */}
          {friendTab === 'sent' && (
            <section>
              <FoldList
                as="ul"
                className="divide-y divide-hairline"
                isEmpty={sentFriends.length === 0}
                empty={
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <p className="text-body-sm text-ink-faint">보낸 친구 요청이 없어요</p>
                  </div>
                }
              >
                {sentFriends.map((friend) => (
                  <FoldLi key={friend.profile.id} {...fold}>
                    <FriendListItem
                      profile={friend.profile}
                      href={undefined}
                      action={<CancelFriendRequestButton friendUserId={friend.profile.id} />}
                    />
                  </FoldLi>
                ))}
              </FoldList>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
