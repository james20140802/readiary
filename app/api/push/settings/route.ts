import { unauthorized } from '@/lib/api/auth';
import { pushClient, pushReady, pushTestAllowed, reply, sameOrigin } from '@/lib/push/server';
import { DEFAULT_PUSH_PREFERENCES } from '@/lib/push/types';
import { validPreferences } from '@/lib/push/validation';
export async function GET() {
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return unauthorized();
  const { data, error } = await db
    .from('push_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return error
    ? reply({ error: '알림 설정을 불러오지 못했습니다.' }, 503)
    : reply({
        preferences: data ?? DEFAULT_PUSH_PREFERENCES,
        available: pushReady() || pushTestAllowed(user.id),
        testAvailable: pushTestAllowed(user.id),
        scheduledAvailable: pushReady(),
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
      });
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '허용되지 않은 요청입니다.' }, 403);
  const db = await pushClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return unauthorized();
  const p = await request.json().catch(() => null);
  if (!validPreferences(p))
    return reply({ error: '알림 종류, 시간대와 요일을 확인해 주세요.' }, 400);
  if (p.enabled && !pushReady() && !pushTestAllowed(user.id))
    return reply({ error: '푸시 알림을 준비 중입니다.' }, 503);
  const { error } = await db.rpc('save_push_preferences', {
    p_enabled: p.enabled,
    p_kinds: p.kinds,
    p_timezone: p.timezone,
    p_hour: p.hour,
    p_weekdays: p.weekdays,
  });
  return error ? reply({ error: '설정 저장에 실패했습니다.' }, 500) : reply({ ok: true });
}
