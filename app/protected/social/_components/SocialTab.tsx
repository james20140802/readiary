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
import { Users } from 'lucide-react';

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
  const [mainTab, setMainTab] = useState<'feed' | 'manage'>('feed');
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
    <div className="space-y-5">
      {/* 대분류 탭 — 컴팩트하게 */}
      <Tabs
        tabs={mainTabs}
        defaultValue={mainTab}
        onChange={(id) => setMainTab(id as 'feed' | 'manage')}
        fullWidth
      />

      {/* 피드 탭 */}
      {mainTab === 'feed' && (
        <div className="animate-in fade-in duration-300">
          {initialFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-border dark:border-dark-border rounded-2xl">
              <Users size={32} className="text-label-muted" />
              <p className="text-body-sm font-medium text-label dark:text-label-invert">
                친구들의 활동이 아직 없어요
              </p>
              <p className="text-caption text-label-muted">친구를 추가하면 피드가 채워져요</p>
            </div>
          ) : (
            <DetailSocailFeedList initialFeed={initialFeed} userId={userId} />
          )}
        </div>
      )}

      {/* 친구 관리 탭 */}
      {mainTab === 'manage' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* 친구 검색 — tint-subtle 배경으로 섹션 구분 강조 */}
          <div className="p-4 rounded-xl border border-tint/20 bg-tint-subtle dark:bg-tint/10">
            <p className="text-body-sm font-bold mb-3 text-tint">🔍 새로운 친구 찾기</p>
            <FriendRequestForm />
          </div>

          <div className="space-y-3">
            {/* 친구 관리 서브 탭 */}
            <Tabs
              tabs={friendTabs}
              defaultValue={friendTab}
              onChange={(id) => setFriendTab(id as 'friends' | 'pending' | 'sent')}
              fullWidth={isMobile}
            />

            <div>
              {/* 친구 목록 */}
              {friendTab === 'friends' && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {acceptedFriends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Users size={28} className="text-label-muted" />
                      <p className="text-body-sm text-label-muted">아직 친구가 없어요</p>
                    </div>
                  ) : (
                    <AnimatedListSection>
                      {acceptedFriends.map((friend) => (
                        <li key={friend.profile.id}>
                          <FriendListItem
                            profile={friend.profile}
                            href={`/protected/social/u/${friend.profile.nickname}-${friend.profile.tag}`}
                            action={
                              <span className="text-caption font-semibold text-tint bg-tint-subtle dark:bg-tint/10 px-2.5 py-1 rounded-full border border-tint/20 ml-auto shrink-0">
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
                      <p className="text-body-sm text-label-muted">받은 친구 요청이 없어요</p>
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
                      <p className="text-body-sm text-label-muted">보낸 친구 요청이 없어요</p>
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
      )}
    </div>
  );
}
