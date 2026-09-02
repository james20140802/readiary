import { describe, expect, it } from 'vitest';
import {
  SPINE_DEFAULT_WIDTH,
  SPINE_HEIGHTS,
  SPINE_MAX_WIDTH,
  SPINE_MIN_WIDTH,
  spineHeight,
  spineWidth,
} from '../spine';

describe('spineWidth', () => {
  it('총 쪽수에 비례해 두꺼워진다', () => {
    expect(spineWidth(100)).toBeLessThan(spineWidth(300));
    expect(spineWidth(300)).toBeLessThan(spineWidth(600));
  });

  it('상·하한 안에 머문다', () => {
    expect(spineWidth(1)).toBe(SPINE_MIN_WIDTH);
    expect(spineWidth(5000)).toBe(SPINE_MAX_WIDTH);
  });

  it('쪽수를 모르면 기본 두께', () => {
    expect(spineWidth(null)).toBe(SPINE_DEFAULT_WIDTH);
    expect(spineWidth(undefined)).toBe(SPINE_DEFAULT_WIDTH);
    expect(spineWidth(0)).toBe(SPINE_DEFAULT_WIDTH);
    expect(spineWidth(-10)).toBe(SPINE_DEFAULT_WIDTH);
    expect(spineWidth(Number.NaN)).toBe(SPINE_DEFAULT_WIDTH);
  });
});

describe('spineHeight', () => {
  it('같은 제목은 항상 같은 키', () => {
    expect(spineHeight('천 개의 파랑')).toBe(spineHeight('천 개의 파랑'));
  });

  it('정해진 키 중 하나만 돌려준다', () => {
    for (const title of ['밝은 밤', '모비 딕', '시와 산책', '', '이처럼 사소한 것들']) {
      expect(SPINE_HEIGHTS).toContain(spineHeight(title));
    }
  });
});
