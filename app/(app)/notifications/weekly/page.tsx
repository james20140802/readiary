import { WEEKLY_LIMIT, type WeeklyEntry } from '@/components/notifications/WeeklyTimeline';
import WeeklyRecords from '@/components/notifications/WeeklyRecords';
import { formatReadingPeriod, toKSTDateString } from '@/lib/dates';
import { pushClient } from '@/lib/push/server';
import PushSeen from '@/components/PushSeen';
export default async function Page() {
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const period =
    formatReadingPeriod([toKSTDateString(new Date(since)), toKSTDateString(now)]) ?? '';
  const { data, error } = await db
    .from('entries')
    .select('id,date,quote,note,is_private,user_books!inner(user_id,books(title))')
    .eq('user_books.user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(WEEKLY_LIMIT);
  const rows = (data as unknown as WeeklyEntry[] | null) ?? [];
  return (
    <>
      <PushSeen kind="weekly" />
      <WeeklyRecords entries={rows} failed={!!error} period={period} />
    </>
  );
}
