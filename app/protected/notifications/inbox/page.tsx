import Link from 'next/link';
import { pushClient } from '@/lib/push/server';
import type { PushItem } from '@/lib/push/types';
import PushSeen from '@/components/PushSeen';
import BackButton from '@/components/ui/BackButton';
export default async function Page() {
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db
    .from('push_deliveries')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['sent', 'claimed'])
    .order('created_at', { ascending: false })
    .limit(20);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-page-title">독서 소식</h1>
      </header>
      <Link className="underline text-body-sm" href="/protected/notifications/settings">
        휴대폰 알림 설정
      </Link>
      {error ? (
        <p>소식을 불러오지 못했습니다.</p>
      ) : !data?.length ? (
        <p>아직 도착한 소식이 없어요.</p>
      ) : (
        data.map((d) => (
          <section key={d.id} className="border rounded-xl p-4 space-y-3">
            <PushSeen kind="inbox" id={d.id} />
            <time className="text-caption" dateTime={d.created_at}>
              {new Date(d.created_at).toISOString().slice(0, 10)}
            </time>
            <ul className="space-y-3">
              {(d.items as unknown as PushItem[]).map((item, i) => (
                <li key={i}>
                  <Link className="underline" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="text-caption text-ink-sub">
        기록이 삭제되거나 공개 범위가 바뀌면 연결된 내용을 볼 수 없어요.
      </p>
    </div>
  );
}
