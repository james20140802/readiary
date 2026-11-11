import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const UID = '11111111-2222-3333-4444-555555555555';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  deleteUser: vi.fn(),
  recheck: vi.fn(),
}));

vi.mock('@/lib/account/admin', () => ({
  accountAdmin: () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
    auth: { admin: { deleteUser: mocks.deleteUser } },
    from: () => ({
      select: () => ({ eq: () => ({ lte: () => ({ maybeSingle: mocks.recheck }) }) }),
    }),
  }),
}));

import { GET } from '../route';

const call = (secret = 'abc') =>
  GET(
    new Request('https://app.test/api/cron/account-deletion', {
      headers: { authorization: `Bearer ${secret}` },
    })
  );
const files = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => ({ name: `f${from + i}.jpg`, id: `id${from + i}` }));

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'abc');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'k');
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === 'claim_due_account_deletions') return { data: [UID], error: null };
    if (name === 'prune_account_purges') return { data: 2, error: null };
    return { data: null, error: null };
  });
  mocks.list.mockImplementation(async (_p: string, o: { offset: number }) => ({
    data: o.offset === 0 ? files(100) : o.offset === 100 ? files(50, 100) : [],
    error: null,
  }));
  mocks.remove.mockImplementation(async (b: string[]) => ({
    data: b.map((name) => ({ name })),
    error: null,
  }));
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.recheck.mockResolvedValue({ data: { user_id: UID }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/cron/account-deletion', () => {
  it('rejects a wrong secret', async () => {
    expect((await call('nope')).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('removes every file across pages before deleting the user', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ purged: 1, failed: 0, pruned: 2 });
    const removed = mocks.remove.mock.calls.flatMap((c) => c[0] as string[]);
    expect(removed).toHaveLength(150);
    expect(removed).toContain(`${UID}/f149.jpg`);
    expect(mocks.deleteUser).toHaveBeenCalledWith(UID);
    expect(mocks.rpc).toHaveBeenCalledWith('record_account_purge', { p_user: UID });
    const recordOrder =
      mocks.rpc.mock.invocationCallOrder[
        mocks.rpc.mock.calls.findIndex((c) => c[0] === 'record_account_purge')
      ];
    expect(recordOrder).toBeGreaterThan(mocks.remove.mock.invocationCallOrder.at(-1)!);
    expect(mocks.deleteUser.mock.invocationCallOrder[0]).toBeGreaterThan(recordOrder);
  });

  it('recurses into sub folders', async () => {
    mocks.list.mockImplementation(async (p: string) => ({
      data: p === UID ? [{ name: 'sub', id: null }] : [{ name: 'a.jpg', id: 'x' }],
      error: null,
    }));
    await call();
    expect(mocks.remove).toHaveBeenCalledWith([`${UID}/sub/a.jpg`]);
  });

  it('skips the user and reports 500 when a remove fails, still pruning', async () => {
    mocks.remove
      .mockResolvedValueOnce({ data: files(100), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ purged: 0, failed: 1, pruned: 2 });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('prune_account_purges');
  });

  it('counts a list failure as failed', async () => {
    mocks.list.mockResolvedValue({ data: null, error: { message: 'x' } });
    const res = await call();
    expect(res.status).toBe(500);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('skips without counting when the deletion row is no longer due', async () => {
    mocks.recheck.mockResolvedValue({ data: null, error: null });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ purged: 0, failed: 0, pruned: 2 });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('treats user-not-found as already deleted', async () => {
    mocks.deleteUser.mockResolvedValue({ error: { status: 404, code: 'user_not_found' } });
    const res = await call();
    expect(await res.json()).toEqual({ purged: 1, failed: 0, pruned: 2 });
    expect(mocks.rpc).toHaveBeenCalledWith('record_account_purge', { p_user: UID });
  });

  it('does not delete the user when recording the purge fails', async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'claim_due_account_deletions') return { data: [UID], error: null };
      if (name === 'record_account_purge') return { data: null, error: { message: 'x' } };
      return { data: 0, error: null };
    });
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ purged: 0, failed: 1 });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('counts a deleteUser failure after recording as failed', async () => {
    mocks.deleteUser.mockResolvedValue({ error: { status: 500, message: 'boom' } });
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ purged: 0, failed: 1 });
    expect(mocks.rpc).toHaveBeenCalledWith('record_account_purge', { p_user: UID });
  });

  it('fails the user when remove does not confirm every file', async () => {
    mocks.remove.mockResolvedValue({ data: [], error: null });
    const res = await call();
    expect(res.status).toBe(500);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('returns 503 when the service env is missing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const res = await call();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ enabled: false });
  });

  it('never leaks the user id', async () => {
    mocks.remove.mockResolvedValue({ data: null, error: { message: UID } });
    expect(await (await call()).text()).not.toContain(UID);
  });
});
