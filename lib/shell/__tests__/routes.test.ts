import { describe, expect, it } from 'vitest';
import { frameFor, ruledFor, showsNav, tabFor } from '../routes';

describe('frameFor', () => {
  it.each([
    ['/', 'landing'],
    ['/login', 'bare'],
    ['/share/e/abc', 'bare'],
    ['/invite/x', 'bare'],
    ['/privacy', 'bare'],
    ['/books', 'leaves'],
    ['/books/1', 'leaves'],
    ['/books/new', 'plain'],
    ['/books/1/excerpts', 'plain'],
    ['/books/1/entry/new', 'plain'],
    ['/bookstore', 'plain'],
    ['/today', 'leaves'],
    ['/entry/abc', 'leaves'],
    ['/entry/abc/edit', 'plain'],
    ['/entryish/abc', 'plain'],
    ['/social/u/a/entry/abc', 'leaves'],
    ['/sharing', 'plain'],
  ])('%s의 틀은 %s', (p, f) => expect(frameFor(p)).toBe(f));
});

describe('ruledFor', () => {
  it('틀마다 괘선', () => {
    expect(ruledFor('leaves')).toBe('margin');
    expect(ruledFor('feed')).toBe('margin');
    expect(ruledFor('plain')).toBe('plain');
    expect(ruledFor('bare')).toBe('plain');
    expect(ruledFor('landing')).toBeNull();
  });
});

describe('tabFor', () => {
  it.each([
    ['/today', 'today'],
    ['/entry/1', 'today'],
    ['/entry/1/edit', 'today'],
    ['/pilsa', 'today'],
    ['/books', 'books'],
    ['/books/1/excerpts', 'books'],
    ['/social', 'social'],
    ['/social/u/a', 'social'],
    ['/social/notifications', 'bell'],
    ['/notifications/inbox', 'bell'],
    ['/profile', 'me'],
    ['/settings', 'me'],
    ['/search', 'search'],
    ['/bookstore', null],
    ['/', null],
  ])('%s → %s', (p, t) => expect(tabFor(p)).toBe(t));
});

describe('showsNav', () => {
  it('메뉴는 로그인한 앱 화면에서만', () => {
    expect(showsNav('plain', true)).toBe(true);
    expect(showsNav('plain', false)).toBe(false);
    expect(showsNav('bare', true)).toBe(false);
    expect(showsNav('landing', true)).toBe(false);
  });
});

describe('나 화면', () => {
  it('나는 장 넘김(leaves), 설정은 도구 화면(plain)', () => {
    expect(frameFor('/profile')).toBe('leaves');
    expect(frameFor('/settings')).toBe('plain');
  });
});

describe('오늘', () => {
  it('오늘은 간지 틀(여백선·장 넘김), 비슷한 접두사는 아니다', () => {
    expect(frameFor('/today')).toBe('leaves');
    expect(frameFor('/todayx')).toBe('plain');
  });
});
