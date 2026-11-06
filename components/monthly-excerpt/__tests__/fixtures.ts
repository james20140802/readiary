import type { ExcerptItem } from '@/lib/monthly-excerpt/types';

export function item(i: number, over: Partial<ExcerptItem> = {}): ExcerptItem {
  return {
    position: i,
    entryId: `e${i}`,
    date: '2026-03-14',
    quote: `문장 ${i}`,
    note: null,
    isPrivate: false,
    fromPage: 88,
    toPage: null,
    book: { id: 'b1', title: '아무튼, 메모', author: null },
    ...over,
  };
}

/** jsdom에는 matchMedia·ResizeObserver가 없다. 동작 줄이기로 흉내 내 Pile이 애니메이션 없이 넘어가게 한다 */
export function stubBrowser(stub: (name: string, value: unknown) => void) {
  // jsdom에는 Web Animations도 없다
  Element.prototype.animate = (() => ({})) as unknown as Element['animate'];
  stub('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
  stub(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
}
