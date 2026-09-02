import { describe, expect, it } from 'vitest';
import {
  bookmarkTint,
  BOOKMARK_TINTS,
  indexLabel,
  spineThickness,
  THICKNESS_MAX,
  THICKNESS_MIN,
} from '../bookGeometry';

describe('spineThickness', () => {
  it('완독 0권이면 최소 두께', () => {
    expect(spineThickness(0)).toBe(THICKNESS_MIN);
  });
  it('완독 권수에 비례해 두꺼워진다', () => {
    expect(spineThickness(4)).toBeGreaterThan(spineThickness(1));
    expect(spineThickness(4) - spineThickness(3)).toBe(spineThickness(2) - spineThickness(1));
  });
  it('상한을 넘지 않고 음수·소수는 방어한다', () => {
    expect(spineThickness(1000)).toBe(THICKNESS_MAX);
    expect(spineThickness(-3)).toBe(THICKNESS_MIN);
    expect(spineThickness(2.9)).toBe(spineThickness(2));
  });
});

describe('indexLabel', () => {
  it('"2026년 4월"을 "2026.04"로 접는다', () => {
    expect(indexLabel('2026년 4월')).toBe('2026.04');
    expect(indexLabel('2026년 12월')).toBe('2026.12');
  });
  it('모르는 형식은 그대로 둔다', () => {
    expect(indexLabel('April')).toBe('April');
  });
});

describe('bookmarkTint', () => {
  it('같은 id는 같은 색, 색은 팔레트 안', () => {
    expect(bookmarkTint('abc')).toBe(bookmarkTint('abc'));
    expect(BOOKMARK_TINTS).toContain(bookmarkTint('xyz-123'));
  });
});
