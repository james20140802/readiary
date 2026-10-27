// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useStableViewportHeight } from '@/hooks/useStableViewportHeight';

function setWindow(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}
const vh = () => document.documentElement.style.getPropertyValue('--vh');

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty('--vh');
});

describe('useStableViewportHeight', () => {
  it('폭이 같으면 높이가 바뀌어도 --vh를 그대로 둔다', () => {
    setWindow(390, 700);
    renderHook(() => useStableViewportHeight());
    expect(vh()).toBe('700px');
    setWindow(390, 760);
    fireEvent(window, new Event('resize'));
    expect(vh()).toBe('700px');
    setWindow(844, 390);
    fireEvent(window, new Event('resize'));
    expect(vh()).toBe('390px');
  });

  it('언마운트하면 resize를 더 이상 듣지 않는다', () => {
    setWindow(390, 700);
    const { unmount } = renderHook(() => useStableViewportHeight());
    unmount();
    setWindow(844, 390);
    fireEvent(window, new Event('resize'));
    expect(vh()).toBe('700px');
  });
});
