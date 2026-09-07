import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushDatabase, PushItem, SubscriptionRow } from './types';
import { validEndpoint } from './validation';
/** Each network attempt happens at most once; ambiguous failures consume the claim budget. */
export async function sendClaim(db: SupabaseClient<PushDatabase>, id: string) {
  const { data, error } = await db.rpc('authorize_push_delivery', { p_id: id });
  if (error) throw new Error('Push authorization failed');
  const authorized = data as unknown as {
    items: PushItem[];
    subscriptions: SubscriptionRow[];
  } | null;
  if (!authorized) {
    await db.from('push_deliveries').update({ status: 'cancelled' }).eq('id', id);
    return false;
  }
  let sent = false;
  for (const s of authorized.subscriptions) {
    if (!validEndpoint(s.endpoint)) continue;
    // Refresh consent and subscriptions before each device, including opt-out during a multi-device run.
    const check = await db.rpc('authorize_push_delivery', { p_id: id });
    const current = check.data as unknown as typeof authorized;
    if (check.error) throw new Error('Push consent check failed');
    if (!current?.subscriptions.some((x) => x.id === s.id)) continue;
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({
          title: 'Readiary',
          body: current.items.length === 1 ? current.items[0].label : '돌아볼 독서 소식이 모였어요',
          url: '/protected/notifications/inbox',
          tag: 'readiary-reading',
        }),
        {
          vapidDetails: {
            subject: process.env.VAPID_SUBJECT!,
            publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
            privateKey: process.env.VAPID_PRIVATE_KEY!,
          },
          TTL: 3600,
          timeout: 5000,
          urgency: 'low',
        }
      );
      sent = true;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410)
        await db.from('push_subscriptions').delete().eq('id', s.id);
      // Never log endpoint, keys, payload, or the web-push error object.
    }
  }
  const result = await db
    .from('push_deliveries')
    .update({ status: sent ? 'sent' : 'failed' })
    .eq('id', id);
  if (result.error) throw new Error('Push result update failed');
  return sent;
}
