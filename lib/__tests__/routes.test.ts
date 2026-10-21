import { compile, match } from 'next/dist/compiled/path-to-regexp';
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
  // Next가 redirects를 컴파일할 때와 같은 path-to-regexp·옵션으로 규칙을 맞춰 본다
  const rules = LEGACY_REDIRECTS.map((rule) => ({
    match: match(rule.source, {
      strict: true,
      sensitive: false,
      delimiter: '/',
      decode: decodeURIComponent,
    }),
    toPath: compile(rule.destination, { validate: false }),
  }));
  const destinationsFor = (pathname: string) =>
    rules.flatMap((rule) => {
      const found = rule.match(pathname);
      return found ? [rule.toPath(found.params)] : [];
    });

  it.each([
    ['/protected', '/today'],
    ['/protected/dashboard', '/today'],
    ['/protected/dashboard/x', '/today/x'],
    ['/protected/books', '/books'],
    ['/protected/books/1/entry/new', '/books/1/entry/new'],
    ['/protected/social/notifications', '/social/notifications'],
    ['/protected/dashboards', '/dashboards'],
  ])('%s → %s through exactly one rule (Vercel does not keep rule order)', (from, to) => {
    expect(destinationsFor(from)).toEqual([to]);
  });

  it('every rule is permanent (308)', () => {
    expect(LEGACY_REDIRECTS.every((rule) => rule.permanent)).toBe(true);
  });

  it('an old-style return path still passes sanitizing (the redirect rule then takes it)', () => {
    expect(sanitizeRedirectPath('/protected/social?invite=x')).toBe('/protected/social?invite=x');
    expect(sanitizeRedirectPath(null)).toBe('/today');
  });
});
