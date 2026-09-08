import { afterEach, describe, it, expect, vi } from 'vitest';
import { apiFetch } from '@/lib/api/fetch';
import {
  disableAccountPush,
  disableDevicePush,
  enableDevicePush,
  readyPushWorker,
} from '../browser';
vi.mock('@/lib/api/fetch', () => ({ apiFetch: vi.fn() }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe('device opt-out', () => {
  it('retains the endpoint and owner for retry when server deletion fails', async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const removeItem = vi.fn();
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: async () => ({
          pushManager: {
            getSubscription: async () => ({
              endpoint: 'https://fcm.googleapis.com/test',
              unsubscribe,
            }),
          },
        }),
      },
    });
    vi.stubGlobal('localStorage', { removeItem });
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(disableDevicePush()).rejects.toThrow();
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(null, { status: 200 }));
    await disableDevicePush();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(removeItem).toHaveBeenCalledOnce();
  });

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

describe('device registration', () => {
  it('registers a worker before waiting and stores the resulting subscription', async () => {
    const subscription = {
      toJSON: () => ({ endpoint: 'https://push.example/test' }),
      unsubscribe: vi.fn(),
    };
    const subscribe = vi.fn().mockResolvedValue(subscription);
    const worker = { pushManager: { getSubscription: async () => null, subscribe } };
    let activate!: (value: typeof worker) => void;
    const ready = new Promise<typeof worker>((resolve) => {
      activate = resolve;
    });
    const register = vi.fn().mockImplementation(async () => {
      activate(worker);
      return worker;
    });
    const setItem = vi.fn();
    vi.stubGlobal('navigator', { serviceWorker: { register, ready } });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem });
    vi.mocked(apiFetch).mockResolvedValue(new Response(null, { status: 200 }));
    await enableDevicePush('AQID', 'user');
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/push/subscription',
      expect.objectContaining({ method: 'POST' })
    );
    expect(setItem).toHaveBeenCalledWith('readiary:push-owner', 'user');
  });

  it('reports a stalled worker without incorrectly asking the user to install again', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({}),
        ready: new Promise(() => {}),
      },
    });
    const result = expect(readyPushWorker()).rejects.toThrow('알림 연결 준비가 지연');
    await vi.advanceTimersByTimeAsync(10000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('propagates registration failure and clears its timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register: vi.fn().mockRejectedValue(new Error('registration failed')),
        ready: new Promise(() => {}),
      },
    });
    await expect(readyPushWorker()).rejects.toThrow('registration failed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
