'use client';

import SocialFeedView from '@/components/social/feed/SocialFeedView';
import SocialFeedSkeleton from '@/components/social/feed/SocialFeedSkeleton';
import { FEED, FRIENDS, PENDING, REFERENCE_TIME } from './fixtures';
import LabFetchStub from './LabFetchStub';
import LabStates from './LabStates';

const PAGE = 3;

/** 친구의 문장 견본 — state: 기본(이어 불러오기 성공) · empty · loading · error · nofriends */
export default function FeedLab({ state }: { state?: string }) {
  if (state === 'loading')
    return (
      <>
        <LabStates base="/design-lab/social" states={STATES} current={state} />
        <SocialFeedSkeleton />
      </>
    );

  const empty = state === 'empty' || state === 'nofriends';
  return (
    <>
      <LabFetchStub />
      <LabStates base="/design-lab/social" states={STATES} current={state} />
      <SocialFeedView
        initialFeed={empty ? [] : FEED.slice(0, PAGE)}
        userId="lab-me"
        referenceTime={REFERENCE_TIME}
        pendingFriends={empty ? [] : PENDING}
        friendCount={state === 'nofriends' ? 0 : FRIENDS.length}
        pageSize={PAGE}
        loadPage={async (page) => {
          await new Promise((r) => setTimeout(r, 700));
          if (state === 'error') throw new Error('견본 오류');
          return FEED.slice(page * PAGE, page * PAGE + PAGE);
        }}
      />
    </>
  );
}

const STATES = [
  { key: '', label: '기본' },
  { key: 'error', label: '이어 불러오기 실패' },
  { key: 'empty', label: '비어 있음' },
  { key: 'nofriends', label: '친구 없음' },
  { key: 'loading', label: '불러오는 중' },
];
