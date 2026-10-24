/**
 * 알림 견본 — 예시 데이터. `redesign` → `main` 머지 전에 지운다. 프로덕션에서는 열리지 않는다.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import NotificationList from '@/app/(app)/social/_components/NotificationList';
import NotificationsHeader from '@/components/social/NotificationsHeader';
import { DELIVERIES, NOTIFICATIONS, REFERENCE_TIME } from '../fixtures';
import LabFetchStub from '../LabFetchStub';
import LabStates from '../LabStates';

export const metadata: Metadata = { title: '알림 견본', robots: { index: false } };

export default async function NotificationsLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();
  const { state } = await searchParams;
  const empty = state === 'empty';
  return (
    <>
      <LabFetchStub />
      <LabStates
        base="/design-lab/social/notifications"
        current={state}
        states={[
          { key: '', label: '기본' },
          { key: 'empty', label: '비어 있음' },
          { key: 'error', label: '일부 실패' },
        ]}
      />
      <NotificationsHeader />
      <NotificationList
        notifications={empty ? [] : NOTIFICATIONS}
        deliveries={empty || state === 'error' ? [] : DELIVERIES}
        deliveriesError={state === 'error'}
        referenceTime={REFERENCE_TIME}
      />
    </>
  );
}
