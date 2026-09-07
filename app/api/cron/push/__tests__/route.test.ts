import { afterEach, describe, it, expect, vi } from 'vitest';
import { GET } from '../route';
vi.mock('@/lib/push/server', () => ({
  pushReady: () => false,
  reply: (data: unknown, status = 200) => Response.json(data, { status }),
}));
afterEach(() => {
  vi.unstubAllEnvs();
});
describe('cron authorization', () => {
  it('fails closed when no secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await GET(new Request('https://app.test/api/cron/push'))).status).toBe(401);
  });
  it('rejects a unicode header without timingSafeEqual length errors', async () => {
    vi.stubEnv('CRON_SECRET', 'abc');
    expect(
      (
        await GET(
          new Request('https://app.test/api/cron/push', {
            headers: { authorization: 'Bearer ééé' },
          })
        )
      ).status
    ).toBe(401);
  });
  it('leaves delivery disabled unless configured', async () => {
    vi.stubEnv('CRON_SECRET', 'abc');
    const r = await GET(
      new Request('https://app.test/api/cron/push', { headers: { authorization: 'Bearer abc' } })
    );
    expect(await r.json()).toEqual({ enabled: false });
  });
});
