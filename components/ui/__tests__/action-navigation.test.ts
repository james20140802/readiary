// @vitest-environment jsdom
import { createElement as h } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActionNavigation, { ACTION_NAVIGATION_DELAY } from '../ActionNavigation';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ActionNavigation', () => {
  it('목적지가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(h(ActionNavigation, { href: null }));
    expect(container.textContent).toBe('');
  });

  it('바로는 화면 읽기 프로그램에만 알리고, 3초가 지나야 링크를 보인다', () => {
    render(h(ActionNavigation, { href: '/books' }));
    expect(screen.getByRole('status').className).toContain('sr-only');
    expect(screen.queryByRole('link')).toBeNull();

    act(() => vi.advanceTimersByTime(ACTION_NAVIGATION_DELAY - 1));
    expect(screen.queryByRole('link')).toBeNull();

    act(() => vi.advanceTimersByTime(1));
    const link = screen.getByRole('link', { name: '이동이 늦으면 여기를 눌러 주세요' });
    expect(link.getAttribute('href')).toBe('/books');
    expect(screen.getByRole('status').className).not.toContain('sr-only');
  });

  it('목적지가 바뀌면 3초를 새로 잰다', () => {
    const { rerender } = render(h(ActionNavigation, { href: '/books' }));
    act(() => vi.advanceTimersByTime(ACTION_NAVIGATION_DELAY));
    rerender(h(ActionNavigation, { href: '/today' }));
    expect(screen.queryByRole('link')).toBeNull();
    act(() => vi.advanceTimersByTime(ACTION_NAVIGATION_DELAY));
    expect(screen.getByRole('link').getAttribute('href')).toBe('/today');
  });
});
