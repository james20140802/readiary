// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Pile from '../Pile';
import { flipOutX } from '@/lib/pile/geometry';

type FakeAnimation = {
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
  cancel(): void;
  finish(): void;
  keyframes: Keyframe[];
};

// jsdom에는 PointerEvent가 없어 clientX 등이 사라진다. MouseEvent로 흉내 낸다.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}
(window as unknown as { PointerEvent: unknown }).PointerEvent = FakePointerEvent;
const animations: FakeAnimation[] = [];
const lastAnimation = () => animations[animations.length - 1];
let reduced = false;
const reduceMotion = (v: boolean) => {
  reduced = v;
};

beforeEach(() => {
  animations.length = 0;
  reduced = false;
  HTMLElement.prototype.animate = vi.fn((keyframes: Keyframe[]) => {
    const a: FakeAnimation = {
      onfinish: null,
      oncancel: null,
      cancel() {},
      finish() {},
      keyframes,
    };
    animations.push(a);
    return a as unknown as Animation;
  });
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const items = ['가', '나', '다', '라', '마'];
const renderPile = (list = items) =>
  render(
    React.createElement(Pile<string>, {
      items: list,
      getKey: (s) => s,
      label: '덧붙인 생각 묶음',
      renderSlip: (s) => React.createElement('a', { href: `#${s}` }, s),
    })
  );

describe('Pile', () => {
  it('맨 위 장만 초점을 받는다', () => {
    renderPile();
    expect(screen.getByText('가').closest('[inert]')).toBeNull();
    for (const s of ['나', '다', '라', '마'])
      expect(screen.getByText(s).closest('[inert]')).not.toBeNull();
    expect(screen.getByText('1/5')).toBeTruthy();
  });

  it('동작 줄이기에서 다음을 누르면 바로 다음 장이 맨 위', () => {
    reduceMotion(true);
    renderPile();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('2/5')).toBeTruthy();
    expect(screen.getByText('가').closest('[inert]')).not.toBeNull();
    expect(screen.getByText('나').closest('[inert]')).toBeNull();
  });

  it('넘기는 중에는 다음을 받지 않는다', () => {
    reduceMotion(false);
    vi.useFakeTimers();
    renderPile();
    const next = screen.getByRole('button', { name: '다음' });
    fireEvent.click(next);
    fireEvent.click(next);
    act(() => vi.advanceTimersByTime(560 * 0.38));
    expect(screen.getByText('2/5')).toBeTruthy();
    fireEvent.click(next);
    act(() => vi.advanceTimersByTime(560));
    expect(screen.getByText('2/5')).toBeTruthy(); // onfinish 전
    act(() => lastAnimation().onfinish?.());
    fireEvent.click(next);
    act(() => vi.advanceTimersByTime(560 * 0.38));
    expect(screen.getByText('3/5')).toBeTruthy();
  });

  it('한 장이면 다음이 비활성', () => {
    renderPile(['가']);
    expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true);
  });

  describe('손으로 밀기', () => {
    const translateX = (el: Element) => {
      const m = /translate\((-?[\d.]+)px/.exec((el as HTMLElement).style.transform);
      return m ? Number(m[1]) : 0;
    };
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
      // 폭 300의 장. transform의 translate x만큼 왼쪽이 움직인다.
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement
      ) {
        const left = translateX(this);
        return {
          left,
          right: left + 300,
          top: 0,
          bottom: 100,
          width: 300,
          height: 100,
          x: left,
          y: 0,
          toJSON() {},
        };
      });
      reduceMotion(false);
      vi.useFakeTimers();
    });
    afterEach(() => vi.restoreAllMocks());

    const slipOf = (text: string) => screen.getByText(text).parentElement as HTMLElement;
    const ptr = (target: Element | Window, type: string, x: number, y = 0) =>
      fireEvent(target, new FakePointerEvent(type, { bubbles: true, clientX: x, clientY: y }));
    const tap = (a: HTMLElement) => {
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      a.dispatchEvent(click);
      return click;
    };

    it('멀리 밀면 넘어가고 따라오는 클릭은 막힌다', () => {
      renderPile();
      const link = screen.getByText('가');
      ptr(slipOf('가'), 'pointerdown', 10);
      ptr(window, 'pointermove', 110);
      ptr(window, 'pointermove', 210);
      ptr(window, 'pointerup', 210);
      expect(tap(link).defaultPrevented).toBe(true);
      act(() => vi.advanceTimersByTime(560 * 0.38));
      expect(screen.getByText('2/5')).toBeTruthy();
    });

    it('끌지 않은 탭의 클릭은 막지 않는다', () => {
      renderPile();
      ptr(slipOf('가'), 'pointerdown', 10);
      ptr(window, 'pointerup', 10);
      expect(tap(screen.getByText('가')).defaultPrevented).toBe(false);
      act(() => vi.advanceTimersByTime(560));
      expect(screen.getByText('1/5')).toBeTruthy();
    });

    it('세로로 먼저 움직이면 넘기지 않는다', () => {
      renderPile();
      ptr(slipOf('가'), 'pointerdown', 10, 0);
      ptr(window, 'pointermove', 13, 10);
      ptr(window, 'pointermove', 300, 10);
      ptr(window, 'pointerup', 300, 10);
      act(() => vi.advanceTimersByTime(560));
      expect(screen.getByText('1/5')).toBeTruthy();
      expect(animations.length).toBe(0);
    });

    it('끌고 넘길 때 빠지는 거리는 끌린 만큼이 아니라 제자리 기준이다', () => {
      renderPile();
      const below = slipOf('나');
      ptr(slipOf('가'), 'pointerdown', 10);
      ptr(window, 'pointermove', 110);
      ptr(window, 'pointermove', 210);
      ptr(window, 'pointerup', 210);
      const belowRight = translateX(below) + 300;
      const ox = flipOutX(0, belowRight, 400);
      const turn = lastAnimation().keyframes.find((k) => k.offset === 0.38)!;
      expect(turn.transform).toContain(`translate(${ox}px,-8px)`);
    });
  });
});
