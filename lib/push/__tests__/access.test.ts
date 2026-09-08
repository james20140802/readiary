import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
import { pushReady, pushTestAllowed } from '../server';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe('private push testing', () => {
  function setup() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T12:00:00Z'));
    for (const key of [
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
      'VAPID_SUBJECT',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_SECRET',
    ])
      vi.stubEnv(key, 'configured');
    vi.stubEnv('PUSH_ENABLED', 'false');
    vi.stubEnv('PUSH_TEST_USER_IDS', 'owner-id');
    vi.stubEnv('PUSH_TEST_UNTIL', '2026-09-15T00:00:00+09:00');
  }
  it('only allows the configured ID without enabling scheduled dispatch', () => {
    setup();
    expect(pushTestAllowed('owner-id')).toBe(true);
    expect(pushTestAllowed('other-id')).toBe(false);
    expect(pushReady()).toBe(false);
  });
  it('fails closed for missing or expired configuration', () => {
    setup();
    vi.stubEnv('PUSH_TEST_UNTIL', '');
    expect(pushTestAllowed('owner-id')).toBe(false);
    vi.stubEnv('PUSH_TEST_UNTIL', '2026-09-07T00:00:00Z');
    expect(pushTestAllowed('owner-id')).toBe(false);
    vi.stubEnv('PUSH_TEST_UNTIL', '2026-09-15T00:00:00Z');
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    expect(pushTestAllowed('owner-id')).toBe(false);
  });
});
