'use client';

import Tabs from '@/components/ui/Tabs';
import { Friend } from '@/types/friends';
import { useState } from 'react';
import AcceptFriendRequestButton from './AcceptFriendRequestButton';
import CancelFriendRequestButton from './CancelFriendRequestButton';
import DeclineFriendRequestButton from './DeclineFriendRequestButton';
import FriendListItem from './FriendListItem';
import AnimatedListSection from '@/components/ui/AnimatedListSecion';

interface Props {
  acceptedFriends: Friend[];
  pendingFriends: Friend[];
  sentFriends: Friend[];
}

export default function SocialTab({ acceptedFriends, pendingFriends, sentFriends }: Props) {
  const tabItems = [
    { label: '📋 친구 목록', value: 'friends' },
    { label: '⏳ 받은 요청', value: 'pending' },
    { label: '📤 보낸 요청', value: 'sent' },
  ];
  const [tab, setTab] = useState<'friends' | 'pending' | 'sent'>('friends');

  return (
    <>
      <Tabs
        tabs={tabItems}
        defaultValue={tab}
        onChange={(id) => setTab(id as 'friends' | 'pending' | 'sent')}
        fullWidth
      />
      {tab === 'friends' && (
        <section>
          {acceptedFriends.length === 0 ? (
            <p className="text-secondary text-center text-body-text">아직 친구가 없습니다.</p>
          ) : (
            <AnimatedListSection>
              {acceptedFriends.map((friend) => (
                <li key={friend.profile.id}>
                  <FriendListItem
                    profile={friend.profile}
                    href={`/protected/social/${friend.profile.nickname}-${friend.profile.tag}`}
                    action={null}
                  />
                </li>
              ))}
            </AnimatedListSection>
          )}
        </section>
      )}

      {tab === 'pending' && (
        <section>
          {pendingFriends.length === 0 ? (
            <p className="text-secondary text-center text-body-text">신청 중인 친구가 없습니다.</p>
          ) : (
            <AnimatedListSection>
              {pendingFriends.map((friend) => (
                <li key={friend.profile.id}>
                  <FriendListItem
                    profile={friend.profile}
                    href={undefined}
                    action={
                      <div className="flex gap-2 ml-auto">
                        <AcceptFriendRequestButton friendUserId={friend.profile.id} />
                        <DeclineFriendRequestButton friendUserId={friend.profile.id} />
                      </div>
                    }
                  />
                </li>
              ))}
            </AnimatedListSection>
          )}
        </section>
      )}

      {tab === 'sent' && (
        <section>
          {sentFriends.length === 0 ? (
            <p className="text-secondary text-center text-body-text">보낸 친구 요청이 없습니다.</p>
          ) : (
            <AnimatedListSection>
              {sentFriends.map((friend) => (
                <li key={friend.profile.id}>
                  <FriendListItem
                    profile={friend.profile}
                    href={undefined}
                    action={<CancelFriendRequestButton friendUserId={friend.profile.id} />}
                  />
                </li>
              ))}
            </AnimatedListSection>
          )}
        </section>
      )}
    </>
  );
}
