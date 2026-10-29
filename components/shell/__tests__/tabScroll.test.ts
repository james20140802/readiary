// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let currentPath = '/books';
vi.mock('next/navigation', () => ({ usePathname: () => currentPath }));

import { TabBar } from '@/components/shell/TabBar';
import { useTopAfterTabNavigation } from '@/components/shell/tabScroll';

function Shell() {
  useTopAfterTabNavigation();
  return h(TabBar);
}

const scrollTo = vi.fn();
beforeEach(() => {
  currentPath = '/books';
  scrollTo.mockClear();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

describe('탭 이동은 맨 위에서 시작한다', () => {
  it('다른 탭을 누르면 새 화면이 그려진 뒤 맨 위로 올린다', () => {
    const { rerender } = render(h(Shell));
    // jsdom은 링크 이동을 하지 않으므로 기본 동작을 막고 주소 변경만 흉내 낸다
    fireEvent.click(screen.getByRole('link', { name: '나' }), { button: 0 });
    expect(scrollTo).not.toHaveBeenCalled();
    currentPath = '/profile';
    rerender(h(Shell));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('지금 탭을 다시 누르면 그 자리에서 맨 위로', () => {
    render(h(Shell));
    fireEvent.click(screen.getByRole('link', { name: '책장' }), { button: 0 });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('탭을 누르지 않은 주소 변경(뒤로 가기 등)은 스크롤을 건드리지 않는다', () => {
    const { rerender } = render(h(Shell));
    currentPath = '/profile';
    rerender(h(Shell));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('새 탭으로 여는 누름은 이 화면을 옮기지 않는다', () => {
    const { rerender } = render(h(Shell));
    fireEvent.click(screen.getByRole('link', { name: '나' }), { button: 0, metaKey: true });
    currentPath = '/profile';
    rerender(h(Shell));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
