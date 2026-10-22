// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Pile from '../Pile';

type FakeAnimation = { onfinish: (() => void) | null; cancel(): void; finish(): void };
const animations: FakeAnimation[] = [];
const lastAnimation = () => animations[animations.length - 1];
let reduced = false;
const reduceMotion = (v: boolean) => {
  reduced = v;
};

beforeEach(() => {
  animations.length = 0;
  reduced = false;
  HTMLElement.prototype.animate = vi.fn(() => {
    const a: FakeAnimation = { onfinish: null, cancel() {}, finish() {} };
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
});
