import { unauthorized } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { pushClient, pushTestAllowed, reply, sameOrigin } from '@/lib/push/server';
import { validEndpoint } from '@/lib/push/validation';
import type { PushDatabase, SubscriptionRow } from '@/lib/push/types';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '허용되지 않은 요청입니다.' }, 403);
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return unauthorized();
  if (!pushTestAllowed(user.id)) return reply({ error: '테스트가 허용되지 않은 계정입니다.' }, 403);
  const body = await request.json().catch(() => null);
  if (!validEndpoint(body?.endpoint)) return reply({ error: '잘못된 기기입니다.' }, 400);
  const admin = createClient<PushDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
  // A DB row lock enforces one attempt per account per minute across server instances.
  const claim = await admin.rpc('claim_push_test', { p_user: user.id, p_endpoint: body.endpoint });
  if (claim.error)
    return reply({ error: '테스트 준비에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  if (!claim.data)
    return reply(
      { error: '이 기기 알림을 켰는지 확인하고, 마지막 테스트에서 1분 뒤 다시 시도해 주세요.' },
      429
    );
  const subscription = claim.data as unknown as SubscriptionRow;
  // Recheck current consent and ownership after claiming, immediately before the network send.
  const [preference, device] = await Promise.all([
    db.from('push_preferences').select('enabled').eq('user_id', user.id).maybeSingle(),
    db
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', subscription.id)
      .maybeSingle(),
  ]);
  if (
    preference.error ||
    device.error ||
    !preference.data?.enabled ||
    !device.data ||
    !pushTestAllowed(user.id)
  )
    return reply({ error: '기기 알림이 해제되었거나 확인에 실패했습니다.' }, 409);
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({ body: '테스트 알림이에요. 독서의 안부가 이렇게 도착해요.' }),
      {
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT!,
          publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          privateKey: process.env.VAPID_PRIVATE_KEY!,
        },
        TTL: 300,
        timeout: 5000,
        urgency: 'normal',
      }
    );
    return reply({ accepted: true });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await admin
        .from('push_subscriptions')
        .delete()
        .eq('id', subscription.id)
        .eq('user_id', user.id);
      return reply({ error: '기기 연결이 만료됐어요. 이 기기 알림을 다시 연결해 주세요.' }, 410);
    }
    // Never log endpoints, keys or provider errors. Ambiguous attempts are not retried.
    return reply(
      { error: '발송 결과를 확인하지 못했어요. 알림 센터를 확인한 뒤 다시 시도해 주세요.' },
      502
    );
  }
}
