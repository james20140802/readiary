import Link from 'next/link';
import { pushClient } from '@/lib/push/server';
import PushSeen from '@/components/PushSeen';
import BackButton from '@/components/ui/BackButton';
export default async function Page() {
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const since = new Date(new Date().getTime() - 7 * 86400000).toISOString();
  const { data, error } = await db
    .from('entries')
    .select('id,date,quote,note,user_books!inner(user_id,books(title))')
    .eq('user_books.user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = data as unknown as
    | {
        id: string;
        date: string;
        quote: string | null;
        note: string | null;
        user_books: { books: { title: string } };
      }[]
    | null;
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-page-title">이번 주의 기록</h1>
      </header>
      <PushSeen kind="weekly" />
      <p className="text-body-sm">최근 7일 동안 남긴 기록이에요. 어떤 문장이 가장 오래 남았나요?</p>
      {error ? (
        <p>기록을 불러오지 못했습니다.</p>
      ) : !rows?.length ? (
        <p>이번 주에는 아직 기록이 없어요.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((e) => (
            <li key={e.id} className="border rounded-xl p-4">
              <Link href={`/protected/entry/${e.id}`}>
                <p className="font-medium">{e.user_books.books.title}</p>
                <time dateTime={e.date} className="text-caption">
                  {e.date}
                </time>
                <p className="line-clamp-4 mt-2">
                  {e.quote || e.note || '읽은 분량을 기록했어요.'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rows?.length === 50 && <p>최근 50개 기록을 보여드려요.</p>}
    </div>
  );
}
