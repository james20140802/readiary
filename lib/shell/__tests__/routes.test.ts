import { describe, expect, it } from 'vitest';
import { frameFor, ruledFor } from '../routes';

describe('frameFor', () => {
  it.each([
    ['/', 'landing'],
    ['/login', 'bare'],
    ['/share/e/abc', 'bare'],
    ['/invite/x', 'bare'],
    ['/privacy', 'bare'],
    ['/today', 'plain'],
    ['/books/1', 'plain'],
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
