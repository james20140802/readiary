import Link from 'next/link';
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

  const { items: notifications, error } = await fetchNotifications();

  return (
    <div className="space-y-4">
      <header className="px-1 flex items-center gap-1">
        <BackButton />
        <h1 className="text-page-title text-ink">알림</h1>
      </header>

      <Link href="/protected/notifications/settings" className="block text-body-sm underline">
        휴대폰 알림 설정
      </Link>
      <Link href="/protected/notifications/inbox" className="block text-body-sm underline">
        독서 소식
      </Link>
      <NotificationsView
        notifications={notifications}
        error={error}
        referenceTime={new Date().toISOString()}
      />
    </div>
  );
}
