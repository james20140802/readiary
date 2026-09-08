import { beforeEach, describe, expect, it, vi } from 'vitest';
import webpush from 'web-push';
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  allowed: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  del: vi.fn(),
}));
vi.mock('web-push', () => ({ default: { sendNotification: vi.fn() } }));
vi.mock('@/lib/push/server', () => ({
  pushClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }),
  pushTestAllowed: mocks.allowed,
  sameOrigin: (r: Request) =>
    !r.headers.get('origin') || r.headers.get('origin') === new URL(r.url).origin,
  reply: (data: unknown, status = 200) => Response.json(data, { status }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: mocks.rpc, from: () => ({ delete: mocks.del }) }),
}));
import { POST } from '@/app/api/push/test/route';
const subscription = {
  id: 'device',
  endpoint: 'https://fcm.googleapis.com/test',
  p256dh: 'key',
  auth: 'auth',
};
function request(
  body: unknown = { endpoint: subscription.endpoint },
  origin = 'https://readiary.net'
) {
  return new Request('https://readiary.net/api/push/test', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } });
  mocks.allowed.mockReturnValue(true);
  mocks.rpc.mockResolvedValue({ data: subscription, error: null });
  mocks.from.mockImplementation((table) => {
    const chain = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: table === 'push_preferences' ? { enabled: true } : { id: 'device' },
        error: null,
      }),
    };
    chain.eq.mockReturnValue(chain);
    return { select: () => chain };
  });
  const chain = { eq: vi.fn() };
  chain.eq.mockReturnValue(chain);
  mocks.del.mockReturnValue(chain);
  vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
});
describe('manual push test route', () => {
  it('rejects cross-origin requests before touching auth or sending', async () => {
    expect((await POST(request({}, 'https://evil.test'))).status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('requires authentication and the server allowlist', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await POST(request())).status).toBe(401);
    mocks.allowed.mockReturnValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('cannot select a recipient with a body user ID', async () => {
    await POST(request({ endpoint: subscription.endpoint, userId: 'other' }));
    expect(mocks.rpc).toHaveBeenCalledWith('claim_push_test', {
      p_user: 'owner',
      p_endpoint: subscription.endpoint,
    });
  });
  it('fails closed for missing claims and DB errors', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(request())).status).toBe(429);
    mocks.rpc.mockResolvedValueOnce({ data: null, error: {} });
    expect((await POST(request())).status).toBe(503);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
  it('rechecks consent before dispatch', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { enabled: false } }),
          eq: () => ({ maybeSingle: async () => ({ data: { id: 'device' } }) }),
        }),
      }),
    });
    expect((await POST(request())).status).toBe(409);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
  it('sends once to the claimed device with generic content', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: true });
    expect(webpush.sendNotification).toHaveBeenCalledOnce();
    expect(vi.mocked(webpush.sendNotification).mock.calls[0][0].endpoint).toBe(
      subscription.endpoint
    );
  });
  it('cleans up expired devices and never retries ambiguous failures', async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce({ statusCode: 410 });
    expect((await POST(request())).status).toBe(410);
    expect(mocks.del).toHaveBeenCalledOnce();
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(new Error('timeout'));
    expect((await POST(request())).status).toBe(502);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });
});
