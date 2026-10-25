'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import type { Friend } from '@/types/friends';
import type { Profile } from '@/types/profile';
import Sheet from '@/components/ui/Sheet';
import { FoldLi, FoldList } from '@/components/ui/FoldList';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { useTopBar } from '@/components/shell/TopBarContext';
import { useFold } from '@/hooks/useFold';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import SheetRow from '@/components/social/SheetRow';
import FriendRequestActions from '@/components/social/requests/FriendRequestActions';
import CancelFriendRequestButton from '@/components/social/requests/CancelFriendRequestButton';
import { RemoveFriendConfirm } from '@/components/social/RemoveFriendButton';
import { useRemoveFriend } from '@/components/social/useRemoveFriend';
import FriendAvatar from './FriendAvatar';
import FriendSearchForm from './FriendSearchForm';
import InviteCard from './InviteCard';
import Segmented from './Segmented';

export type FriendsTabValue = 'friends' | 'pending' | 'sent';

export interface FriendsViewProps {
  acceptedFriends: Friend[];
  pendingFriends: Friend[];
  sentFriends: Friend[];
  initialTab?: FriendsTabValue;
  initialInviteQuery?: string;
  /** 내 닉네임·태그 — 없으면 초대 간지를 그리지 않는다 */
  me?: { nickname: string; tag: string } | null;
}

const slug = (p: Profile) => `${p.nickname}-${p.tag}`;
const panelId = (v: FriendsTabValue) => `friends-panel-${v}`;

/** 친구 — 찾기, 친구·받은 요청·보낸 요청 탭, 초대 간지 (시안 friends.html) */
export default function FriendsView({
  acceptedFriends,
  pendingFriends,
  sentFriends,
  initialTab = 'friends',
  initialInviteQuery,
  me,
}: FriendsViewProps) {
  useTopBar({ title: '친구', back: { href: '/social', label: '소셜' } });
  // 열어 둔 채 써도 새 친구 신청이 새로고침 없이 도착하도록
  useLiveRefresh();
  // 수락·거절·취소한 요청은 접히며 빠지고 아래 줄이 그만큼 올라온다
  const fold = useFold();
  const [tab, setTab] = useState<FriendsTabValue>(initialTab);
  const [menuFor, setMenuFor] = useState<Profile | null>(null);
  const [confirmFor, setConfirmFor] = useState<Profile | null>(null);
  const removal = useRemoveFriend();

  const tabs: { value: FriendsTabValue; label: React.ReactNode }[] = [
    {
      value: 'friends',
      label: (
        <>
          친구 <span data-skeleton>{acceptedFriends.length}</span>
        </>
      ),
    },
    {
      value: 'pending',
      label: (
        <>
          받은 요청 <span data-skeleton>{pendingFriends.length}</span>
        </>
      ),
    },
    {
      value: 'sent',
      label: (
        <>
          보낸 요청 <span data-skeleton>{sentFriends.length}</span>
        </>
      ),
    },
  ];

  return (
    <div>
      <LargeTitle>친구</LargeTitle>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-14">
        <div className="mt-[18px]">
          <FriendSearchForm initialQuery={initialInviteQuery} />

          <Segmented
            label="친구 목록"
            items={tabs}
            value={tab}
            onChange={setTab}
            panelId={panelId}
            className="mt-6"
          />

          <section
            id={panelId(tab)}
            role="tabpanel"
            aria-labelledby={`${panelId(tab)}-tab`}
            className="mt-2.5"
          >
            {tab === 'friends' &&
              (acceptedFriends.length === 0 ? (
                <Empty>아직 친구가 없어요. 닉네임#태그로 찾거나 초대 링크를 보내 보세요.</Empty>
              ) : (
                <ul>
                  {acceptedFriends.map(({ profile }) => (
                    <li key={profile.id}>
                      <Row profile={profile} href={`/social/u/${slug(profile)}`}>
                        <button
                          type="button"
                          onClick={() => setMenuFor(profile)}
                          aria-label={`${profile.name} 더 보기`}
                          aria-haspopup="dialog"
                          className="grid h-11 w-11 place-items-center rounded-full text-ink-sub hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden />
                        </button>
                      </Row>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === 'pending' && (
              <FoldList
                as="ul"
                isEmpty={pendingFriends.length === 0}
                empty={<Empty>받은 친구 신청이 없어요.</Empty>}
              >
                {pendingFriends.map(({ profile }) => (
                  <FoldLi key={profile.id} {...fold}>
                    <Row profile={profile}>
                      <FriendRequestActions friendUserId={profile.id} name={profile.name} />
                    </Row>
                  </FoldLi>
                ))}
              </FoldList>
            )}

            {tab === 'sent' && (
              <FoldList
                as="ul"
                isEmpty={sentFriends.length === 0}
                empty={<Empty>보낸 친구 신청이 없어요.</Empty>}
              >
                {sentFriends.map(({ profile }) => (
                  <FoldLi key={profile.id} {...fold}>
                    <Row profile={profile}>
                      <CancelFriendRequestButton friendUserId={profile.id} name={profile.name} />
                    </Row>
                  </FoldLi>
                ))}
              </FoldList>
            )}
          </section>
        </div>

        {me && (
          <InviteCard
            nickname={me.nickname}
            tag={me.tag}
            className="mt-[26px] lg:sticky lg:top-11 lg:mt-0"
          />
        )}
      </div>

      <Sheet open={!!menuFor} onClose={() => setMenuFor(null)} ariaLabel="친구 메뉴">
        {menuFor && (
          <div>
            <SheetRow href={`/social/u/${slug(menuFor)}`} onClick={() => setMenuFor(null)}>
              {menuFor.name}의 서재 보기
            </SheetRow>
            <SheetRow
              danger
              onClick={() => {
                setConfirmFor(menuFor);
                setMenuFor(null);
              }}
            >
              친구 끊기
            </SheetRow>
          </div>
        )}
      </Sheet>

      <RemoveFriendConfirm
        open={!!confirmFor}
        name={confirmFor?.name}
        busy={removal.busy}
        onCancel={() => {
          if (!removal.isLocked()) setConfirmFor(null);
        }}
        onConfirm={async () => {
          if (confirmFor) await removal.remove(confirmFor.id);
          setConfirmFor(null);
        }}
      />
    </div>
  );
}

/** 시안 .fr — 44px 얼굴, 이름(17) 아래 닉네임#태그(14), 오른쪽 동작 */
function Row({
  profile,
  href,
  children,
}: {
  profile: Profile;
  href?: string;
  children?: React.ReactNode;
}) {
  const name = (
    <span data-skeleton className="block truncate font-sans text-[17px] font-semibold text-ink">
      {profile.name}
    </span>
  );
  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-x-3.5 border-t border-hairline py-3">
      <span data-skeleton>
        <FriendAvatar profile={profile} />
      </span>
      <div className="min-w-0">
        {href ? (
          <Link
            href={href}
            className={clsx(
              'block rounded-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'
            )}
          >
            {name}
            <span className="sr-only">의 서재</span>
          </Link>
        ) : (
          name
        )}
        <span
          data-skeleton
          className="block truncate font-sans text-[14px] font-medium text-ink-sub"
        >
          {profile.nickname}#{profile.tag}
        </span>
      </div>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-hairline py-10 text-center font-sans text-body-sm text-ink-sub">
      {children}
    </p>
  );
}
