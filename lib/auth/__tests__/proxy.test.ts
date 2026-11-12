import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));
const getUser = vi.fn();
const lookup = vi.fn();
const select = vi.fn();
const builder = {
  select: (...args: unknown[]) => {
    select(...args);
    return builder;
  },
  eq: () => builder,
  maybeSingle: lookup,
};
const pending = { id: 'a', account_deletions: [{ purge_after: '2026-11-26T00:00:00Z' }] };

beforeEach(() => {
  vi.resetModules();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'a' } }, error: null });
  select.mockReset();
  lookup.mockReset().mockResolvedValue({ data: { id: 'a', account_deletions: [] }, error: null });
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getUser },
    from: () => builder,
  } as never);
});
const request = (path: string) => new NextRequest('https://readiary.test' + path);

describe('proxy authentication and profile cache', () => {
  it('still verifies auth on every request, while skipping repeated profile lookups', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/today'));
    await updateSession(request('/books'));
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenCalledTimes(1);
  });
  it('a cached profile never admits a revoked session', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/today'));
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(request('/books?sort=recent'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://readiary.test/login?redirect=%2Fbooks%3Fsort%3Drecent'
    );
  });
  it('onboarding reads the source even after a cache hit', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/today'));
    await updateSession(request('/onboarding'));
    expect(lookup).toHaveBeenCalledTimes(2);
  });
  it('lookup failures return a non-cacheable 503 instead of a false onboarding redirect', async () => {
    lookup.mockResolvedValue({ data: null, error: { code: 'timeout' } });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/today'));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('location')).toBeNull();
  });
  it('degrades to a plain profile read when the deletion embed fails (migration not applied yet)', async () => {
    lookup
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST200' } })
      .mockResolvedValueOnce({ data: { id: 'a' }, error: null });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/today'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(select).toHaveBeenNthCalledWith(1, 'id, account_deletions(purge_after)');
    expect(select).toHaveBeenNthCalledWith(2, 'id');
  });
  it('preserves refreshed auth cookies on onboarding redirects', async () => {
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      getUser.mockImplementation(async () => {
        (options!.cookies as { setAll: (cookies: unknown[]) => void }).setAll([
          { name: 'refreshed', value: 'new-token', options: { httpOnly: true } },
        ]);
        return { data: { user: { id: 'a' } } };
      });
      return { auth: { getUser }, from: () => builder } as never;
    });
    lookup.mockResolvedValue({ data: null, error: null });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/today'));
    expect(response.headers.get('location')).toBe('https://readiary.test/onboarding');
    expect(response.cookies.get('refreshed')?.value).toBe('new-token');
  });

  it('sends a logged-out visitor of a new app route to login, keeping the full return path', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/books?sort=recent'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://readiary.test/login?redirect=%2Fbooks%3Fsort%3Drecent'
    );
  });

  it('does not guard look-alike public paths', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/bookstore'));
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends a finished onboarding to /today', async () => {
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/onboarding'));
    expect(response.headers.get('location')).toBe('https://readiary.test/today');
  });

  it('matcher lists every app route literally', async () => {
    const { config } = await import('../../../proxy');
    const { APP_ROUTE_PREFIXES } = await import('../../routes');
    for (const prefix of APP_ROUTE_PREFIXES) {
      expect(config.matcher).toContain(`${prefix}/:path*`);
    }
    expect(config.matcher).not.toContain('/protected/:path*');
  });

  it('the matcher includes the restore screen', async () => {
    const { config } = await import('../../../proxy');
    expect(config.matcher).toContain('/account/:path*');
  });
});

describe('proxy routing for a pending account deletion', () => {
  it('reads the deletion state together with the profile', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/today'));
    expect(select).toHaveBeenCalledWith('id, account_deletions(purge_after)');
  });
  it('sends a pending reader from the app to the restore screen', async () => {
    lookup.mockResolvedValue({ data: pending, error: null });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/today'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://readiary.test/account/restore');
  });
  it.each(['/books/1', '/settings', '/onboarding', '/', '/login'])(
    'sends a pending reader at %s to the restore screen',
    async (path) => {
      lookup.mockResolvedValue({ data: pending, error: null });
      const { updateSession } = await import('../../../proxy');
      const response = await updateSession(request(path));
      expect(response.headers.get('location')).toBe('https://readiary.test/account/restore');
    }
  );
  it('lets a pending reader open the restore screen', async () => {
    lookup.mockResolvedValue({ data: pending, error: null });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/account/restore'));
    expect(response.headers.get('location')).toBeNull();
    expect(response.status).toBe(200);
  });
  it('sends an active reader away from the restore screen to /today', async () => {
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/account/restore'));
    expect(response.headers.get('location')).toBe('https://readiary.test/today');
  });
  it('the restore screen re-reads the source even after an active cache hit', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/today'));
    lookup.mockResolvedValue({ data: pending, error: null });
    const response = await updateSession(request('/account/restore'));
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(response.headers.get('location')).toBeNull();
  });
  it('sends a logged-out visitor of the restore screen to login', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/account/restore'));
    expect(response.headers.get('location')).toBe(
      'https://readiary.test/login?redirect=%2Faccount%2Frestore'
    );
  });
});
