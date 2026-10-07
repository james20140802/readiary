import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  persist: vi.fn(),
}));
vi.mock('../server', () => ({
  emailAdmin: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      update: mocks.update,
    }),
  }),
}));
import { sendMarketingEmail } from '../delivery';
const input = {
  userId: '00000000-0000-4000-8000-000000000001',
  deliveryId: '10000000-0000-4000-8000-000000000001',
  subject: '새로운 소식',
  text: '새 기능을 만나보세요.',
};
beforeEach(() => {
  vi.resetAllMocks();
  for (const [key, value] of Object.entries({
    EMAIL_MARKETING_SEND_ENABLED: 'true',
    RESEND_API_KEY: 'test',
    EMAIL_UNSUBSCRIBE_SECRET: 'x'.repeat(32),
    EMAIL_MARKETING_FROM: 'Readiary <news@readiary.test>',
    EMAIL_MARKETING_SENDER_INFO: 'Readiary / support@example.test',
    EMAIL_PUBLIC_ORIGIN: 'https://readiary.test',
  }))
    vi.stubEnv(key, value);
  mocks.rpc.mockResolvedValue({ data: { email: 'reader@example.test', version: 1 }, error: null });
  mocks.maybeSingle.mockResolvedValue({
    data: { enabled: true, email: 'reader@example.test', version: 1 },
    error: null,
  });
  mocks.persist.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.persist });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => Response.json({ id: 'provider-1' }))
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('fail-closed Resend adapter', () => {
  it('is disabled by default', async () => {
    vi.stubEnv('EMAIL_MARKETING_SEND_ENABLED', '');
    expect((await sendMarketingEmail(input)).status).toBe('disabled');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('excludes missing, withdrawn or deleted accounts', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect((await sendMarketingEmail(input)).status).toBe('excluded');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('excludes consent revoked after claim', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { enabled: false }, error: null });
    expect((await sendMarketingEmail(input)).status).toBe('excluded');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reuses the same provider key and includes both unsubscribe paths', async () => {
    await sendMarketingEmail(input);
    await sendMarketingEmail(input);
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0][1]?.headers).toEqual(calls[1][1]?.headers);
    const payload = JSON.parse(calls[0][1]?.body as string);
    expect(payload.subject).toMatch(/^\(광고\)/);
    expect(payload.text).toContain('/email/unsubscribe#');
    expect(payload.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(calls[0][1]?.body).toBe(calls[1][1]?.body);
  });
  it('does not resend a durable success', async () => {
    mocks.rpc.mockResolvedValue({ data: { sent: true, provider_id: 'done' }, error: null });
    expect(await sendMarketingEmail(input)).toEqual({ status: 'sent', id: 'done' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('records unknown outcomes instead of inventing success', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network'));
    await expect(sendMarketingEmail(input)).rejects.toThrow('result unknown');
    expect(mocks.update).toHaveBeenCalledWith({ status: 'unknown' });
  });
  it('fails closed on storage outage', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'outage' } });
    await expect(sendMarketingEmail(input)).rejects.toThrow('cannot be claimed');
    expect(fetch).not.toHaveBeenCalled();
  });
});
