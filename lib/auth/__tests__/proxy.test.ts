import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));
const getUser = vi.fn();
const lookup = vi.fn();
const builder = { select: () => builder, eq: () => builder, maybeSingle: lookup };

beforeEach(() => {
  vi.resetModules();
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'a' } }, error: null });
  lookup.mockReset().mockResolvedValue({ data: { id: 'a' }, error: null });
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getUser },
    from: () => builder,
  } as never);
});
const request = (path: string) => new NextRequest('https://readiary.test' + path);

describe('proxy authentication and profile cache', () => {
  it('still verifies auth on every request, while skipping repeated profile lookups', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/protected/dashboard'));
    await updateSession(request('/protected/books'));
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenCalledTimes(1);
  });
  it('a cached profile never admits a revoked session', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/protected/dashboard'));
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(request('/protected/books?sort=recent'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://readiary.test/login?redirect=%2Fprotected%2Fbooks%3Fsort%3Drecent'
    );
  });
  it('onboarding reads the source even after a cache hit', async () => {
    const { updateSession } = await import('../../../proxy');
    await updateSession(request('/protected/dashboard'));
    await updateSession(request('/onboarding'));
    expect(lookup).toHaveBeenCalledTimes(2);
  });
  it('lookup failures return a non-cacheable 503 instead of a false onboarding redirect', async () => {
    lookup.mockResolvedValue({ data: null, error: { code: 'timeout' } });
    const { updateSession } = await import('../../../proxy');
    const response = await updateSession(request('/protected/dashboard'));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('location')).toBeNull();
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
    const response = await updateSession(request('/protected/dashboard'));
    expect(response.headers.get('location')).toBe('https://readiary.test/onboarding');
    expect(response.cookies.get('refreshed')?.value).toBe('new-token');
  });
});
