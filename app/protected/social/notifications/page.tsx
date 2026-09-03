// app/protected/social/notifications/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchNotifications } from '@/lib/notifications/fetchNotifications';
import BackButton from '@/components/ui/BackButton';
import NotificationsView from '../_components/NotificationsView';

export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { items: notifications, error } = await fetchNotifications();

  return (
    <div className="space-y-4">
      <header className="px-1 flex items-center gap-1">
        <BackButton />
        <h1 className="text-page-title text-ink">알림</h1>
      </header>

      <NotificationsView notifications={notifications} error={error} />
    </div>
  );
}
