'use client';

import { useState } from 'react';
import Tabs from '@/components/ui/Tabs';
import DetailSocailFeedList from './DetailSocialFeedList';
import FriendRequestForm from './FriendRequestForm';
import AnimatedListSection from '@/components/ui/AnimatedListSecion';
import FriendListItem from './FriendListItem';
import AcceptFriendRequestButton from './AcceptFriendRequestButton';
import DeclineFriendRequestButton from './DeclineFriendRequestButton';
import CancelFriendRequestButton from './CancelFriendRequestButton';
import { DetailSocialFeedEntry } from '@/types/entry';
import { Friend } from '@/types/friends';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  userId: string;
  initialFeed: DetailSocialFeedEntry[];
  acceptedFriends: Friend[];
  pendingFriends: Friend[];
  sentFriends: Friend[];
}

export default function SocialTab({
  userId,
  initialFeed,
  acceptedFriends,
  pendingFriends,
  sentFriends,
}: Props) {
  // 메인 탭: 피드 vs 친구 관리
  const [mainTab, setMainTab] = useState<'feed' | 'manage'>('feed');
  // 친구 관리 내부 서브 탭
  const [friendTab, setFriendTab] = useState<'friends' | 'pending' | 'sent'>('friends');
  const isMobile = useIsMobile();

  const mainTabs = [
    { label: '✨ 피드', value: 'feed' },
    { label: '👥 친구 관리', value: 'manage' },
  ];

  const friendTabs = [
    { label: '📋 목록', value: 'friends' },
    { label: '⏳ 받은 요청', value: 'pending' },
    { label: '📤 보낸 요청', value: 'sent' },
  ];

  return (
    <div className="space-y-6">
      {/* 대분류 탭 */}
      <Tabs
        tabs={mainTabs}
        defaultValue={mainTab}
        onChange={(id) => setMainTab(id as 'feed' | 'manage')}
        fullWidth
      />

      {/* --- 1. 피드 영역 --- */}
      {mainTab === 'feed' && (
        <div className="animate-in fade-in duration-300">
          {initialFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-3xl border">
              <span className="text-4xl mb-4">📭</span>
              <p className="text-secondary text-body-text">친구들의 활동이 아직 없어요.</p>
            </div>
          ) : (
            <DetailSocailFeedList initialFeed={initialFeed} userId={userId} />
          )}
        </div>
      )}

      {/* --- 2. 친구 관리 영역 --- */}
      {mainTab === 'manage' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* 친구 검색 및 신청 폼 */}
          <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-bold mb-3 ml-1 text-label dark:text-zinc-300">
              새로운 친구 찾기
            </p>
            <FriendRequestForm />
          </div>

          <div className="space-y-4">
            {/* 친구 관리 서브 탭 */}
            <Tabs
              tabs={friendTabs}
              defaultValue={friendTab}
              onChange={(id) => setFriendTab(id as 'friends' | 'pending' | 'sent')}
              fullWidth={isMobile}
            />

            {/* 친구 목록 */}
            <div className="px-1">
              {friendTab === 'friends' && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {acceptedFriends.length === 0 ? (
                    <p className="text-secondary text-center py-10 text-body-text">
                      아직 친구가 없습니다.
                    </p>
                  ) : (
                    <AnimatedListSection>
                      {acceptedFriends.map((friend) => (
                        <li key={friend.profile.id}>
                          <FriendListItem
                            profile={friend.profile}
                            href={`/protected/social/u/${friend.profile.nickname}-${friend.profile.tag}`}
                            action={null}
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
                    <p className="text-secondary text-center py-10 text-body-text">
                      받은 친구 요청이 없습니다.
                    </p>
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
                    <p className="text-secondary text-center py-10 text-body-text">
                      보낸 친구 요청이 없습니다.
                    </p>
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
      )}
    </div>
  );
}
