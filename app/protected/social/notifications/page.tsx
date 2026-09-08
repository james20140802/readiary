import Link from 'next/link';
import { Settings } from 'lucide-react';
import { pushClient } from '@/lib/push/server';
import { getServerUser } from '@/lib/supabase/getServerUser';
// app/protected/social/notifications/page.tsx
import { fetchNotifications } from '@/lib/notifications/fetchNotifications';
import BackButton from '@/components/ui/BackButton';
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
    <div className="space-y-4">
      <header className="px-1 flex items-center gap-1">
        <BackButton />
        <h1 className="text-page-title text-ink">알림</h1>
        <Link
          href="/protected/notifications/settings"
          aria-label="알림 설정"
          title="알림 설정"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-ink-sub hover:bg-card-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Settings size={21} strokeWidth={1.75} aria-hidden />
        </Link>
      </header>

      <NotificationsView
        notifications={notifications}
        error={error}
        deliveries={deliveriesResult.data ?? []}
        deliveriesError={!!deliveriesResult.error}
        referenceTime={new Date().toISOString()}
      />
    </div>
  );
}
