import { PUSH_KINDS, type PushPreferences } from './types';
export function validEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      !u.username &&
      !u.password &&
      !u.port &&
      !u.hash &&
      (['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(
        u.hostname
      ) ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname))
    );
  } catch {
    return false;
  }
}
export function validPreferences(value: unknown): value is PushPreferences {
  if (!value || typeof value !== 'object') return false;
  const p = value as PushPreferences;
  try {
    new Intl.DateTimeFormat('en', { timeZone: p.timezone }).format();
  } catch {
    return false;
  }
  return (
    typeof p.enabled === 'boolean' &&
    typeof p.timezone === 'string' &&
    p.timezone.length <= 100 &&
    Number.isInteger(p.hour) &&
    p.hour >= 9 &&
    p.hour <= 21 &&
    Array.isArray(p.kinds) &&
    p.kinds.length <= 5 &&
    p.kinds.every((k) => PUSH_KINDS.includes(k)) &&
    (!p.enabled || p.kinds.length > 0) &&
    Array.isArray(p.weekdays) &&
    p.weekdays.length > 0 &&
    p.weekdays.length <= 7 &&
    p.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
}
export function validSubscription(
  value: unknown
): value is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!value || typeof value !== 'object') return false;
  const s = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return (
    validEndpoint(s.endpoint) &&
    typeof s.keys?.p256dh === 'string' &&
    /^[A-Za-z0-9_-]{87}=?$/.test(s.keys.p256dh) &&
    typeof s.keys.auth === 'string' &&
    /^[A-Za-z0-9_-]{22}={0,2}$/.test(s.keys.auth)
  );
}
