/**
 * 친구 견본 — 예시 데이터. `redesign` → `main` 머지 전에 지운다. 프로덕션에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import FriendsView, { type FriendsTabValue } from '@/components/social/friends/FriendsView';
import { FRIENDS, ME, PENDING, SENT } from '../fixtures';
import LabFetchStub from '../LabFetchStub';
import LabStates from '../LabStates';

export const metadata: Metadata = { title: '친구 견본', robots: { index: false } };

export default async function FriendsLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const empty = state === 'empty';
  const tab: FriendsTabValue = state === 'pending' || state === 'sent' ? state : 'friends';
  return (
    <>
      <LabFetchStub />
      <LabStates
        base="/design-lab/social/friends"
        current={state}
        states={[
          { key: '', label: '친구' },
          { key: 'pending', label: '받은 요청' },
          { key: 'sent', label: '보낸 요청' },
          { key: 'empty', label: '비어 있음' },
        ]}
      />
      <FriendsView
        key={state ?? ''}
        acceptedFriends={empty ? [] : FRIENDS}
        pendingFriends={empty ? [] : PENDING}
        sentFriends={empty ? [] : SENT}
        initialTab={tab}
        me={ME}
      />
    </>
  );
}
