import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
import { PUT, GET } from '@/app/api/email-preferences/route';
import { POST as unsubscribe, GET as openUnsubscribe } from '@/app/api/email-unsubscribe/route';
import { EMAIL_COPY_VERSION } from '../consent';
const owner = '00000000-0000-4000-8000-000000000001';
const body = {
  accountId: owner,
  expectedEmail: 'owner@example.test',
  enabled: true,
  requestId: '10000000-0000-4000-8000-000000000001',
  expectedVersion: 0,
  copyVersion: EMAIL_COPY_VERSION,
};
const req = (value: unknown, origin = 'https://readiary.test') =>
  new Request('https://readiary.test/api/email-preferences', {
    method: 'PUT',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test');
  vi.stubEnv('EMAIL_CONSENT_ENABLED', 'true');
  vi.stubEnv('EMAIL_CONSENT_EFFECTIVE_AT', '2020-01-01');
  mocks.getUser.mockResolvedValue({
    data: { user: { id: owner, email: 'owner@example.test', email_confirmed_at: '2020-01-01' } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({
    data: { ...body, version: 1, email: 'owner@example.test' },
    error: null,
  });
});
describe('email preference authorization and contract', () => {
  it('requires same origin before accessing the account', async () => {
    expect((await PUT(req(body, 'https://evil.test'))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requires a fresh authenticated user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const r = await PUT(req(body));
    expect(r.status).toBe(401);
    expect((await r.json()).code).toBe('session_expired');
  });
  it('ignores a supplied user id and stamps source and version on the server', async () => {
    const r = await PUT(
      req({ ...body, userId: 'victim', source: 'onboarding', email: 'victim@example.test' })
    );
    expect(r.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'save_email_consent',
      expect.objectContaining({
        p_user: owner,
        p_source: 'settings',
        p_copy: EMAIL_COPY_VERSION,
        p_email: body.expectedEmail,
      })
    );
    expect(r.headers.get('cache-control')).toContain('no-store');
  });
  it.each([
    null,
    {},
    { ...body, enabled: 'true' },
    { ...body, expectedVersion: -1 },
    { ...body, copyVersion: 'old' },
    { ...body, requestId: 'bad' },
    { ...body, expectedEmail: undefined },
    { ...body, expectedEmail: 123 },
  ])('rejects malformed changes: %j', async (value) => {
    expect((await PUT(req(value))).status).toBe(400);
  });
  it.each(['version_conflict', 'email_conflict'])(
    'maps %s to a reloadable conflict',
    async (message) => {
      mocks.rpc.mockResolvedValue({ error: { message } });
      expect((await PUT(req(body))).status).toBe(409);
    }
  );
  it('blocks collection before activation but allows withdrawal', async () => {
    vi.stubEnv('EMAIL_CONSENT_ENABLED', 'false');
    expect((await PUT(req(body))).status).toBe(503);
    expect((await PUT(req({ ...body, enabled: false }))).status).toBe(200);
  });
  it('reads only the authenticated owner and returns no ledger fields', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        enabled: true,
        version: 2,
        email: 'owner@example.test',
        user_id: 'owner',
        token_hash: 'secret',
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    mocks.from.mockReturnValue({ select: () => ({ eq }) });
    const r = await GET();
    expect(eq).toHaveBeenCalledWith('user_id', owner);
    expect(JSON.stringify(await r.json())).not.toContain('token_hash');
  });
});
describe('unsubscribe capability', () => {
  const token = 'a'.repeat(43);
  it('a scanner GET does not mutate and redirects to a non-logged fragment', async () => {
    const r = await openUnsubscribe(
      new Request(`https://readiary.test/api/email-unsubscribe?token=${token}`)
    );
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe(`https://readiary.test/email/unsubscribe#${token}`);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('accepts a signed-capability style one-click request without session', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const r = await unsubscribe(
      new Request(`https://readiary.test/api/email-unsubscribe?token=${token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      })
    );
    expect(r.status).toBe(200);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls[0][1].p_hash).not.toBe(token);
  });
  it('does not report success on persistence failure', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'outage' } });
    const r = await unsubscribe(
      new Request('https://readiary.test/api/email-unsubscribe', {
        method: 'POST',
        headers: { origin: 'https://readiary.test', 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    );
    expect(r.status).toBe(503);
  });
  it('rejects unknown token', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const r = await unsubscribe(
      new Request('https://readiary.test/api/email-unsubscribe', {
        method: 'POST',
        headers: { origin: 'https://readiary.test', 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    );
    expect(r.status).toBe(400);
  });
});

describe('onboarding consent atomic save', () => {
  const profile = { name: '독자', nickname: 'reader', tag: '1234', bio: '', consent: true };
  it.each([true, false])(
    'records explicit selection %s with profile in one RPC',
    async (enabled) => {
      const { POST } = await import('@/app/api/onboarding/route');
      mocks.getUser.mockResolvedValue({
        data: { user: { id: owner, user_metadata: { consented_at: '2026-01-01' } } },
        error: null,
      });
      const r = await POST(req({ ...profile, emailConsent: { ...body, enabled } }));
      expect(r.status).toBe(200);
      expect(mocks.rpc).toHaveBeenCalledWith(
        'save_email_consent',
        expect.objectContaining({
          p_user: owner,
          p_enabled: enabled,
          p_source: 'onboarding',
          p_profile: { name: '독자', nickname: 'reader', tag: '1234', bio: null },
        })
      );
    }
  );
  it('rejects saving from a screen opened by a previous account', async () => {
    const r = await PUT(req({ ...body, accountId: '00000000-0000-4000-8000-000000000002' }));
    expect(r.status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
