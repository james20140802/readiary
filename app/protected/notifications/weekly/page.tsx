import { type WeeklyEntry } from '@/components/notifications/WeeklyTimeline';
import WeeklyRecords from '@/components/notifications/WeeklyRecords';
import { formatReadingPeriod, toKSTDateString } from '@/lib/dates';
import { pushClient } from '@/lib/push/server';
import PushSeen from '@/components/PushSeen';
import BackButton from '@/components/ui/BackButton';
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
    .limit(50);
  const rows = (data as unknown as WeeklyEntry[] | null) ?? [];
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-page-title">이번 주의 기록</h1>
        </div>
        <p className="mt-5 font-serif text-body text-ink-sub">
          지난 7일, 책 사이에 남겨 둔 문장과 생각.
          <br />
          천천히 다시 읽어 보세요.
        </p>
      </header>
      <PushSeen kind="weekly" />
      <WeeklyRecords entries={rows} failed={!!error} period={period} />
    </div>
  );
}
