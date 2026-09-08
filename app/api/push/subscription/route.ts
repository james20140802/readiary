import { pushClient, pushReady, pushTestAllowed, reply, sameOrigin } from '@/lib/push/server';
import { validEndpoint, validSubscription } from '@/lib/push/validation';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '허용되지 않은 요청입니다.' }, 403);
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: '로그인이 필요합니다.' }, 401);
  if (!pushReady() && !pushTestAllowed(user.id))
    return reply({ error: '푸시 알림을 준비 중입니다.' }, 503);
  const s = await request.json().catch(() => null);
  if (!validSubscription(s)) return reply({ error: '지원하지 않는 푸시 구독입니다.' }, 400);
  const { error } = await db.rpc('save_push_subscription', {
    p_endpoint: s.endpoint,
    p_p256dh: s.keys.p256dh,
    p_auth: s.keys.auth,
  });
  return error
    ? reply({ error: '기기 등록에 실패했습니다. 이 기기 알림을 끈 뒤 다시 시도해 주세요.' }, 400)
    : reply({ ok: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '허용되지 않은 요청입니다.' }, 403);
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return reply({ error: '로그인이 필요합니다.' }, 401);
  const s = await request.json().catch(() => null);
  if (!validEndpoint(s?.endpoint)) return reply({ error: '잘못된 구독입니다.' }, 400);
  const { error } = await db
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', s.endpoint);
  return error ? reply({ error: '구독 해제에 실패했습니다.' }, 500) : reply({ ok: true });
}
