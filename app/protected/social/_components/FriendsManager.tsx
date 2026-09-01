'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import FriendRequestForm from './FriendRequestForm';
import AnimatedListSection from '@/components/ui/AnimatedListSecion';
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
    <div className="space-y-5">
      {/* 친구 검색 — accent-soft 배경으로 섹션 구분 강조 */}
      <div className="p-4 rounded-xl border border-accent/20 bg-accent-soft">
        <p className="text-body-sm font-bold mb-3 text-accent">새로운 친구 찾기</p>
        <FriendRequestForm initialQuery={initialInviteQuery} />
      </div>

      <div className="space-y-3">
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
                <AnimatedListSection>
                  {acceptedFriends.map((friend) => (
                    <li key={friend.profile.id}>
                      <FriendListItem
                        profile={friend.profile}
                        href={`/protected/social/u/${friend.profile.nickname}-${friend.profile.tag}`}
                        action={
                          <span className="text-caption font-semibold text-accent bg-accent-soft px-2.5 py-1 rounded-full border border-accent/20 ml-auto shrink-0">
                            프로필 →
                          </span>
                        }
                      />
                    </li>
                  ))}
                </AnimatedListSection>
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

          {/* 보낸 요청 */}
          {friendTab === 'sent' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {sentFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-body-sm text-ink-faint">보낸 친구 요청이 없어요</p>
                </div>
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
        </div>
      </div>
    </div>
  );
}
