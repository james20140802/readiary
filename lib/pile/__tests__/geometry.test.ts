import { describe, expect, it } from 'vitest';
import {
  awayIndexForBack,
  classifyDrag,
  dragLimit,
  dragOffset,
  flipKeyframes,
  flipOutX,
  pileMarginBottom,
  placeSlips,
  randomJitter,
  randomTilt,
  shouldFlip,
  type Pose,
} from '../geometry';

const P = (t: number, jx = 2, jy = -3): Pose => ({ t, jx, jy });

describe('간지 묶음 계산', () => {
  it('한 장이면 제자리, 거의 수평', () => {
    expect(placeSlips([P(2)])).toEqual([{ x: 0, y: 0, r: 0.44, z: 1, hidden: false, top: true }]);
  });
  it('다섯 장이면 맨 아래는 넷째 자리, 사이 한 장은 숨긴 자리', () => {
    const r = placeSlips([P(2), P(-2), P(2), P(-2), P(2)]);
    expect(r[0]).toMatchObject({ x: 50, y: 42, r: 2, hidden: false });
    expect(r[1]).toMatchObject({ x: 40, y: 37, r: -1.8, hidden: true });
    expect(r[2]).toMatchObject({ x: 34, y: 27, r: 1.7, hidden: false });
    expect(r[3]).toMatchObject({ x: 18, y: 12, r: -1.4, hidden: false });
    expect(r[4]).toMatchObject({ x: 0, y: 0, r: 0.44, top: true });
  });
  it('기울기는 기준 장과 반대, 1.3~3.2도', () => {
    expect(randomTilt(2, () => 0)).toBe(-1.3);
    expect(randomTilt(-2, () => 0.999999)).toBe(3.2);
    expect(randomTilt(0, () => 0.4)).toBeLessThan(0);
  });
  it('지터는 ±4px 정수', () => {
    expect(randomJitter(() => 0)).toBe(-4);
    expect(randomJitter(() => 0.999999)).toBe(4);
  });
  it('뒤로 넣을 장의 기준', () => {
    expect(awayIndexForBack(3)).toBe(0);
    expect(awayIndexForBack(7)).toBe(3);
  });
  it('아래 자리 여백', () => {
    expect(pileMarginBottom(1)).toBe(10);
    expect(pileMarginBottom(9)).toBe(55);
    expect(pileMarginBottom(0)).toBe(0);
  });
  it('빼는 거리: 다음 장 너머, 최소 48px는 화면에', () => {
    expect(flipOutX(24, 300, 390)).toBe(286);
    expect(flipOutX(24, 380, 390)).toBe(318);
  });
  it('넘김 키프레임', () => {
    const k = flipKeyframes({ x: 0, y: 0, r: 0.4, z: 5, hidden: false, top: true }, 286, {
      x: 50,
      y: 42,
      r: 2,
      z: 1,
      hidden: false,
      top: false,
    });
    expect(k).toEqual([
      { transform: 'translate(0px,0px) rotate(0.4deg)', easing: 'cubic-bezier(.33,1,.68,1)' },
      {
        transform: 'translate(286px,-8px) rotate(3deg) scale(.985)',
        offset: 0.38,
        easing: 'cubic-bezier(.65,0,.35,1)',
      },
      { transform: 'translate(50px,42px) rotate(2deg)' },
    ]);
  });
  it('끌기: 한계에 가까울수록 무겁고 왼쪽은 16px까지', () => {
    expect(dragOffset(100, 100)).toBeCloseTo(63.21, 2);
    expect(dragOffset(-200, 100)).toBe(-16);
  });
  it('넘김 판정: 한계의 45% 또는 0.11px/ms', () => {
    expect(shouldFlip(46, 100, 1000)).toBe(true);
    expect(shouldFlip(30, 100, 200)).toBe(true);
    expect(shouldFlip(30, 100, 1000)).toBe(false);
  });
  it('세로가 먼저면 스크롤', () => {
    expect(classifyDrag(3, 10)).toBe('scroll');
    expect(classifyDrag(4, 2)).toBe('pending');
    expect(classifyDrag(10, 4)).toBe('drag');
  });
  it('끌기 한계', () => {
    expect(dragLimit(390, 380)).toBe(20);
    expect(dragLimit(390, 300)).toBe(82);
  });
});
