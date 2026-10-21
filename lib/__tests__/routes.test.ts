import { describe, expect, it } from 'vitest';
import { APP_ROUTE_PREFIXES, HOME_PATH, LEGACY_REDIRECTS, isAppRoute } from '../routes';
import { sanitizeRedirectPath } from '../auth/safeRedirect';

describe('app routes', () => {
  it('home is /today', () => {
    expect(HOME_PATH).toBe('/today');
  });

  it('matches each prefix exactly and its children', () => {
    for (const prefix of APP_ROUTE_PREFIXES) {
      expect(isAppRoute(prefix)).toBe(true);
      expect(isAppRoute(`${prefix}/x/y`)).toBe(true);
    }
  });

  it('does not match look-alike prefixes or public pages', () => {
    for (const path of [
      '/todayx',
      '/bookstore',
      '/entryway',
      '/',
      '/login',
      '/share/e/1',
      '/invite/a-1',
    ]) {
      expect(isAppRoute(path)).toBe(false);
    }
  });

  it('covers the spec list', () => {
    expect([...APP_ROUTE_PREFIXES].sort()).toEqual(
      [
        '/books',
        '/entry',
        '/notifications',
        '/pilsa',
        '/profile',
        '/search',
        '/settings',
        '/social',
        '/today',
      ].sort()
    );
  });
});

describe('legacy redirects', () => {
  it('sends the old dashboard to /today before the generic rule', () => {
    expect(LEGACY_REDIRECTS).toEqual([
      { source: '/protected', destination: '/today', permanent: true },
      { source: '/protected/dashboard/:path*', destination: '/today/:path*', permanent: true },
      { source: '/protected/:path*', destination: '/:path*', permanent: true },
    ]);
  });

  it('an old-style return path still passes sanitizing (the redirect rule then takes it)', () => {
    expect(sanitizeRedirectPath('/protected/social?invite=x')).toBe('/protected/social?invite=x');
    expect(sanitizeRedirectPath(null)).toBe('/today');
  });
});
