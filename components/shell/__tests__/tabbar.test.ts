// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let currentPath = '/today';
vi.mock('next/navigation', () => ({ usePathname: () => currentPath }));
const mockPathname = (p: string) => {
  currentPath = p;
};

import { TabBar } from '@/components/shell/TabBar';

afterEach(cleanup);

describe('TabBar', () => {
  it.each([
    ['/entry/3', '오늘'],
    ['/books/1', '책장'],
    ['/settings', '나'],
  ])('%s에서는 %s 탭이 현재', (p, label) => {
    mockPathname(p);
    render(h(TabBar));
    expect(screen.getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page');
  });

  it('탭 순서와 주소', () => {
    mockPathname('/today');
    render(h(TabBar));
    expect(screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual(
      [
        ['오늘', '/today'],
        ['책장', '/books'],
        ['소셜', '/social'],
        ['나', '/profile'],
      ]
    );
  });

  it('찾기 화면에서는 어떤 탭도 현재가 아니다', () => {
    mockPathname('/search');
    render(h(TabBar));
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
  });
});
