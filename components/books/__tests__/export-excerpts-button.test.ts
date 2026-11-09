// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toBlob = vi.hoisted(() => vi.fn(async () => new Blob(['x'], { type: 'image/png' })));
vi.mock('html-to-image', () => ({ toBlob }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ExportExcerptsButton from '../ExportExcerptsButton';

const SLOT = 100;
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;
const clientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!;

beforeEach(() => {
  toBlob.mockClear();
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
  URL.createObjectURL = vi.fn(() => 'blob:card');
  URL.revokeObjectURL = vi.fn();
  // 글자 하나가 1px인 칸으로 꾸민다
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === 'BLOCKQUOTE' ? (this.textContent ?? '').length : 0;
    },
  });
  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get(this: Element) {
      return this.hasAttribute('data-card-slot') ? SLOT : 0;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
  Object.defineProperty(Element.prototype, 'clientHeight', clientHeight);
});

const makeCards = async (quote: string) => {
  render(
    h(ExportExcerptsButton, {
      bookTitle: '책',
      author: '저자',
      quotes: [{ id: 'q1', date: '2026-08-08', quote }],
      entryDates: ['2026-08-08'],
    })
  );
  fireEvent.click(screen.getByRole('button', { name: '이미지로 내보내기' }));
  fireEvent.click(screen.getByRole('button', { name: /카드로 나누어/ }));
  return screen.findAllByRole('img', { name: /발췌집 이미지/ });
};

describe('ExportExcerptsButton 카드', () => {
  it('들어가는 문장은 표지·문장·판권 세 장이다', async () => {
    expect(await makeCards('짧은 문장')).toHaveLength(3);
  });

  it('긴 문장은 4:5를 지키며 다음 카드로 이어 찍는다', async () => {
    const images = await makeCards('가'.repeat(250));
    expect(images).toHaveLength(5);
    await waitFor(() => expect(toBlob).toHaveBeenCalled());
    const captured = toBlob.mock.calls.map((call) => (call as unknown as [HTMLElement])[0]);
    const sizes = new Set(captured.map((el) => `${el.style.width}x${el.style.height}`));
    expect([...sizes]).toEqual(['540pxx675px']);
    const parts = captured.filter((el) => el.querySelector('blockquote'));
    expect(parts.map((el) => el.querySelector('blockquote')?.className).join()).not.toContain(
      'line-clamp'
    );
    expect(parts.map((el) => el.textContent).join()).toContain('1 · 3/3');
  });
});
