import { describe, it, expect } from 'vitest';
import { validEndpoint, validPreferences, validSubscription } from '../validation';
import { DEFAULT_PUSH_PREFERENCES } from '../types';
describe('push input boundary', () => {
  it.each([
    'http://fcm.googleapis.com/a',
    'https://fcm.googleapis.com.evil.test/a',
    'https://127.0.0.1/a',
    'https://user@fcm.googleapis.com/a',
    'https://fcm.googleapis.com:8443/a',
    'https://evil.notify.windows.com.evil.test/a',
  ])('rejects SSRF destination %s', (url) => expect(validEndpoint(url)).toBe(false));
  it.each([
    'https://fcm.googleapis.com/fcm/send/a',
    'https://web.push.apple.com/a',
    'https://updates.push.services.mozilla.com/wpush/v2/a',
  ])('accepts known push service %s', (url) => expect(validEndpoint(url)).toBe(true));
  it('validates consent, quiet hours, weekdays and timezone', () => {
    expect(validPreferences({ ...DEFAULT_PUSH_PREFERENCES, enabled: true })).toBe(false);
    expect(
      validPreferences({ ...DEFAULT_PUSH_PREFERENCES, enabled: true, kinds: ['reminder'] })
    ).toBe(true);
    for (const change of [
      { hour: 22 },
      { weekdays: [] },
      { weekdays: [7] },
      { timezone: 'invalid' },
      { kinds: ['marketing'] },
      { enabled: 'yes' },
      { hour: 9.5 },
    ])
      expect(validPreferences({ ...DEFAULT_PUSH_PREFERENCES, ...change })).toBe(false);
  });
  it('requires subscription encryption keys', () => {
    expect(
      validSubscription({
        endpoint: 'https://fcm.googleapis.com/a',
        keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) },
      })
    ).toBe(true);
    expect(validSubscription({ endpoint: 'https://fcm.googleapis.com/a', keys: {} })).toBe(false);
  });
});
