import { afterEach, describe, it, expect, vi } from 'vitest';
import { apiFetch } from '@/lib/api/fetch';
import { disableAccountPush, disableDevicePush } from '../browser';
vi.mock('@/lib/api/fetch', () => ({ apiFetch: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe('device opt-out', () => {
  it('deletes the server subscription even if browser unsubscribe fails', async () => {
    const unsubscribe = vi.fn().mockRejectedValue(new Error('offline'));
    const close = vi.fn();
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: async () => ({
          pushManager: {
            getSubscription: async () => ({
              endpoint: 'https://fcm.googleapis.com/test',
              unsubscribe,
            }),
          },
          getNotifications: async () => [{ close }],
        }),
      },
    });
    vi.stubGlobal('localStorage', { removeItem: vi.fn() });
    vi.mocked(apiFetch).mockResolvedValue(new Response(null, { status: 200 }));
    await disableDevicePush();
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/push/subscription',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});

describe('account opt-out', () => {
  it('disables all account delivery without depending on browser subscriptions', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(null, { status: 200 }));
    await disableAccountPush();
    const [url, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(url).toBe('/api/push/settings');
    expect(JSON.parse(options!.body as string).enabled).toBe(false);
  });
  it('does not proceed when account revocation fails', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(null, { status: 500 }));
    await expect(disableAccountPush()).rejects.toThrow();
  });
});
