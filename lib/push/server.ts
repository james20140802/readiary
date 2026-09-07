import { PUSH_PRIVACY_EFFECTIVE_AT } from '@/lib/legal/texts';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushDatabase } from './types';
export async function pushClient() {
  return (await createSupabaseServerClient()) as unknown as SupabaseClient<PushDatabase>;
}
export function pushReady() {
  return (
    process.env.PUSH_ENABLED === 'true' &&
    Date.now() >= Date.parse(PUSH_PRIVACY_EFFECTIVE_AT) &&
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY &&
    !!process.env.VAPID_SUBJECT &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.CRON_SECRET
  );
}
export function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
