import { describe, expect, it } from 'vitest';
import {
  STACK_DEFAULT,
  STACK_MAX,
  pageStackShadow,
  pageStacks,
  photoTilt,
} from '@/lib/books/openBook';

describe('pageStacks', () => {
  it('읽은 비율만큼 왼쪽에 쌓이고 나머지는 오른쪽', () => {
    const { left, right } = pageStacks(344, 120, false);
    expect(left + right).toBe(Math.round(6 + 344 / 40));
    expect(left).toBe(Math.round((120 / 344) * (left + right)));
  });

  it('완독이면 전부 왼쪽, 안 읽었으면 전부 오른쪽', () => {
    expect(pageStacks(300, 300, true).right).toBe(0);
    expect(pageStacks(300, null, false).left).toBe(0);
  });

  it('두께는 8–28px 사이', () => {
    expect(pageStacks(40, 0, false).right).toBe(8);
    expect(pageStacks(5000, 0, false).right).toBe(STACK_MAX);
  });

  it('쪽수를 모르면 기본 두께, 읽은 쪽이 있으면 조금은 왼쪽', () => {
    const unknown = pageStacks(null, null, false);
    expect(unknown.left + unknown.right).toBe(STACK_DEFAULT);
    expect(unknown.left).toBe(0);
    expect(pageStacks(null, 40, false).left).toBeGreaterThan(0);
  });
});

describe('pageStackShadow', () => {
  it('px마다 한 줄, 방향은 dir 부호를 따른다', () => {
    const s = pageStackShadow(3, -1);
    expect(s.split(', ')).toHaveLength(3);
    expect(s.startsWith('-1px')).toBe(true);
    expect(pageStackShadow(2, 1).startsWith('1px')).toBe(true);
    expect(pageStackShadow(0, 1)).toBe('none');
  });
});

describe('photoTilt', () => {
  it('같은 id면 같은 각도, 0°는 없고 ±2.7° 안', () => {
    expect(photoTilt('ub1')).toBe(photoTilt('ub1'));
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'ub12']) {
      const t = photoTilt(id);
      expect(t).not.toBe(0);
      expect(Math.abs(t)).toBeLessThanOrEqual(2.7);
    }
  });
});
