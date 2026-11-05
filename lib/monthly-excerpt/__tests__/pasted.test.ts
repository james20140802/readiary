import { describe, expect, it } from 'vitest';
import { pastedDelay, pastedPose } from '../pasted';

describe('pastedPose', () => {
  it('모든 자세가 설계 범위 안이다', () => {
    for (let i = 0; i < 40; i++) {
      const p = pastedPose(i);
      expect(p.tilt).toBeGreaterThanOrEqual(-0.5);
      expect(p.tilt).toBeLessThanOrEqual(0.6);
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(12);
      expect(p.right).toBeGreaterThanOrEqual(0);
      expect(p.right).toBeLessThanOrEqual(12);
    }
  });
  it('이웃한 조각은 다르게 놓이고, 같은 자리는 늘 같다', () => {
    for (let i = 0; i < 20; i++) {
      expect(pastedPose(i)).not.toEqual(pastedPose(i + 1));
      expect(pastedPose(i)).toEqual(pastedPose(i));
    }
  });
});

describe('pastedDelay', () => {
  it('앞의 몇 장까지만 늘고 그 뒤는 같다', () => {
    expect(pastedDelay(0)).toBe(0);
    expect(pastedDelay(2)).toBe(60);
    expect(pastedDelay(8)).toBe(pastedDelay(19));
  });
});
