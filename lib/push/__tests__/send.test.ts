import { beforeEach, describe, it, expect, vi } from 'vitest';
import webpush from 'web-push';
import { sendClaim } from '../send';
vi.mock('web-push', () => ({ default: { sendNotification: vi.fn() } }));
const s = {
  id: 'device',
  endpoint: 'https://fcm.googleapis.com/send/test',
  p256dh: 'key',
  auth: 'auth',
};
function stub(first: unknown, next: unknown = first) {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const del = vi.fn(() => ({ eq }));
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ data: first, error: null })
    .mockResolvedValue({ data: next, error: null });
  return { db: { rpc, from: vi.fn(() => ({ update, delete: del })) }, update, del, rpc };
}
const a = { items: [{ kind: 'reminder', label: '한 문장 남겨보세요' }], subscriptions: [s] };
beforeEach(() => {
  vi.mocked(webpush.sendNotification).mockReset();
});
describe('push dispatch', () => {
  it('does not send after consent withdrawal', async () => {
    const x = stub(a, null);
    expect(await sendClaim(x.db as never, 'claim')).toBe(false);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
  it('removes expired subscriptions without retrying', async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410 });
    const x = stub(a);
    await sendClaim(x.db as never, 'claim');
    expect(x.del).toHaveBeenCalledOnce();
    expect(webpush.sendNotification).toHaveBeenCalledOnce();
  });
  it('does not retry ambiguous timeouts', async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error('timeout'));
    const x = stub(a);
    await sendClaim(x.db as never, 'claim');
    expect(webpush.sendNotification).toHaveBeenCalledOnce();
    expect(x.update).toHaveBeenCalledWith({ status: 'failed' });
  });
  it('uses one generic notification and a fixed inbox target', async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);
    const x = stub({ ...a, items: [...a.items, { kind: 'friends', label: '친구 소식' }] });
    expect(await sendClaim(x.db as never, 'claim')).toBe(true);
    const args = vi.mocked(webpush.sendNotification).mock.calls[0];
    expect(JSON.parse(args[1] as string)).toMatchObject({
      body: '돌아볼 독서 소식이 모였어요',
      url: '/protected/notifications/inbox',
    });
  });
});
