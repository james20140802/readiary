// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Sheet from '../Sheet';

// jsdom에는 matchMedia·ResizeObserver가 없다 — 모바일 폭으로 흉내 낸다
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  onchange: null,
  dispatchEvent: () => false,
}));
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

afterEach(cleanup);

describe('Sheet', () => {
  it('제목과 닫기, 닫기를 누르면 onClose', () => {
    const onClose = vi.fn();
    render(h(Sheet, { open: true, onClose, title: '책 고르기', children: h('p', null, '내용') }));
    expect(screen.getByRole('dialog', { name: '책 고르기' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('Esc로 닫는다', () => {
    const onClose = vi.fn();
    render(
      h(Sheet, { open: true, onClose, title: '책 고르기', children: h('button', null, '안') })
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
  it('제목이 없으면 ariaLabel이 대화상자 이름이 된다', () => {
    render(
      h(Sheet, {
        open: true,
        onClose: () => {},
        ariaLabel: '기록 남기기',
        children: h('p', null, '내용'),
      })
    );
    expect(screen.getByRole('dialog', { name: '기록 남기기' })).toBeTruthy();
  });
  it('닫혀 있으면 그리지 않는다', () => {
    render(h(Sheet, { open: false, onClose: () => {}, title: 'x', children: 'y' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
