import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { pushReady, reply } from '@/lib/push/server';
import { sendClaim } from '@/lib/push/send';
import type { PushDatabase, Delivery } from '@/lib/push/types';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = Buffer.from(process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : '');
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return reply({ error: 'Unauthorized' }, 401);
  if (!pushReady()) return reply({ enabled: false });
  const db = createClient<PushDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  // Bounded requests. Cron can be invoked repeatedly; DB locks/caps prevent duplicate claims.
  const { data, error } = await db.rpc('claim_push_batch', { p_limit: 5 });
  if (error) return reply({ error: 'Push claim failed' }, 500);
  const results = await Promise.allSettled((data ?? []).map((d: Delivery) => sendClaim(db, d.id)));
  if (results.some((r) => r.status === 'rejected'))
    return reply({ error: 'Push dispatch incomplete' }, 500);
  return reply({
    claimed: results.length,
    sent: results.filter((r) => r.status === 'fulfilled' && r.value).length,
  });
}
