import { pushClient } from '@/lib/push/server';
import { getServerUser } from '@/lib/supabase/getServerUser';
// app/(app)/social/notifications/page.tsx
import { fetchNotifications } from '@/lib/notifications/fetchNotifications';
import NotificationsHeader from '@/components/social/NotificationsHeader';
import NotificationsView from '../_components/NotificationsView';

export default async function NotificationsPage() {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) return null;

  const [notificationsResult, deliveriesResult] = await Promise.all([
    fetchNotifications(),
    pushClient().then((db) =>
      db
        .from('push_deliveries')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['sent', 'claimed'])
        .order('created_at', { ascending: false })
        .limit(20)
    ),
  ]);
  const { items: notifications, error } = notificationsResult;

  return (
    <>
      <NotificationsHeader />
      <NotificationsView
        notifications={notifications}
        error={error}
        deliveries={deliveriesResult.data ?? []}
        deliveriesError={!!deliveriesResult.error}
        referenceTime={new Date().toISOString()}
      />
    </>
  );
}
