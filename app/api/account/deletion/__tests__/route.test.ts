import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getClaims: vi.fn(),
  signOut: vi.fn(),
  userRpc: vi.fn(),
  adminRpc: vi.fn(),
  signInWithPassword: vi.fn(),
  createClient: vi.fn(),
  isOpen: vi.fn(),
  forget: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser, getClaims: mocks.getClaims, signOut: mocks.signOut },
    rpc: mocks.userRpc,
  }),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/account/admin', () => ({ accountAdmin: () => ({ rpc: mocks.adminRpc }) }));
vi.mock('@/lib/auth/profilePresence', () => ({ forgetProfileState: mocks.forget }));
vi.mock('@/lib/account/deletion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/account/deletion')>()),
  isAccountDeletionOpen: mocks.isOpen,
}));

import { DELETE, POST } from '../route';

const owner = '00000000-0000-4000-8000-000000000001';
const passwordUser = {
  id: owner,
  email: 'owner@example.test',
  identities: [{ provider: 'email' }],
};
const oauthUser = { id: owner, email: 'owner@example.test', identities: [{ provider: 'google' }] };
const now = () => Math.floor(Date.now() / 1000);
const PURGE = '2026-11-26T00:00:00+00:00';

const req = (method: 'POST' | 'DELETE', body?: unknown, origin = 'https://readiary.test') =>
  new Request('https://readiary.test/api/account/deletion', {
    method,
    headers: { origin, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
  mocks.isOpen.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: passwordUser }, error: null });
  mocks.getClaims.mockResolvedValue({
    data: { claims: { amr: [{ method: 'oauth', timestamp: now() - 60 }] } },
    error: null,
  });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.createClient.mockReturnValue({ auth: { signInWithPassword: mocks.signInWithPassword } });
  mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: owner } }, error: null });
  mocks.adminRpc.mockResolvedValue({ data: PURGE, error: null });
  mocks.userRpc.mockResolvedValue({ data: true, error: null });
});

describe('POST /api/account/deletion', () => {
  it('rejects another origin before touching the account', async () => {
    const r = await POST(req('POST', { password: 'pw' }, 'https://evil.test'));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ code: 'forbidden_origin' });
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it('rejects a request without an Origin header', async () => {
    const r = await POST(
      new Request('https://readiary.test/api/account/deletion', { method: 'POST', body: '{}' })
    );
    expect(r.status).toBe(403);
  });
  it('requires a session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const r = await POST(req('POST', { password: 'pw' }));
    expect(r.status).toBe(401);
    expect((await r.json()).code).toBe('session_expired');
  });
  it('is closed before the effective date', async () => {
    mocks.isOpen.mockReturnValue(false);
    const r = await POST(req('POST', { password: 'pw' }));
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ code: 'not_open' });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it('asks a password reader for the password', async () => {
    const r = await POST(req('POST', {}));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ code: 'password_required' });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
  it('refuses a wrong password without requesting deletion', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });
    const r = await POST(req('POST', { password: 'wrong' }));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ code: 'wrong_password' });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('checks the password on a separate client that keeps no session', async () => {
    await POST(req('POST', { password: 'pw' }));
    expect(mocks.createClient).toHaveBeenCalledWith('https://db.test', 'anon', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.test',
      password: 'pw',
    });
  });
  it('asks a social-login reader to sign in again when the last sign-in is old', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: oauthUser }, error: null });
    mocks.getClaims.mockResolvedValue({
      data: { claims: { amr: [{ method: 'oauth', timestamp: now() - 3600 }] } },
      error: null,
    });
    const r = await POST(req('POST', {}));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ code: 'reauth_required' });
    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it('accepts a social-login reader who just signed in', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: oauthUser }, error: null });
    const r = await POST(req('POST', {}));
    expect(r.status).toBe(200);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it('requests deletion for the session owner, signs out everywhere and forgets the cache', async () => {
    const r = await POST(req('POST', { password: 'pw', userId: 'victim' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ purgeAfter: PURGE });
    expect(r.headers.get('cache-control')).toContain('no-store');
    expect(mocks.adminRpc).toHaveBeenCalledWith('request_account_deletion', { p_user: owner });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(mocks.forget).toHaveBeenCalledWith(owner);
  });
  it('does not sign out when the deletion request fails', async () => {
    mocks.adminRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const r = await POST(req('POST', { password: 'pw' }));
    expect(r.status).toBe(503);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/account/deletion', () => {
  it('rejects another origin', async () => {
    const r = await DELETE(req('DELETE', undefined, 'https://evil.test'));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ code: 'forbidden_origin' });
    expect(mocks.userRpc).not.toHaveBeenCalled();
  });
  it('requires a session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const r = await DELETE(req('DELETE'));
    expect(r.status).toBe(401);
    expect((await r.json()).code).toBe('session_expired');
  });
  it('restores through the reader’s own client and forgets the cache', async () => {
    const r = await DELETE(req('DELETE'));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ restored: true });
    expect(mocks.userRpc).toHaveBeenCalledWith('cancel_account_deletion');
    expect(mocks.adminRpc).not.toHaveBeenCalled();
    expect(mocks.forget).toHaveBeenCalledWith(owner);
  });
  it('answers 200 with restored: false when nothing was pending', async () => {
    mocks.userRpc.mockResolvedValue({ data: false, error: null });
    const r = await DELETE(req('DELETE'));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ restored: false });
  });
  it('reports a failed restore as 503', async () => {
    mocks.userRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const r = await DELETE(req('DELETE'));
    expect(r.status).toBe(503);
  });
});
