// @vitest-environment jsdom
import { createElement as h, useEffect, type ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider, useTopBarState } from '@/components/shell/TopBarContext';
import {
  DesktopLeaf,
  DesktopLeaves,
  Leaf,
  LeafStack,
  LeafSwitch,
  Leaves,
} from '@/components/shell/Leaves';

// 관찰 중인 요소를 기억하고, 테스트가 제목·id별 교차 비율을 보고하는 가짜 IntersectionObserver
const observers: FakeIO[] = [];
class FakeIO {
  els = new Set<Element>();
  constructor(private cb: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(el: Element) {
    this.els.add(el);
  }
  unobserve(el: Element) {
    this.els.delete(el);
  }
  disconnect() {
    this.els.clear();
  }
  takeRecords() {
    return [];
  }
  emit(entries: { el: Element; ratio: number }[]) {
    this.cb(
      entries.map(
        ({ el, ratio }) =>
          ({
            target: el,
            intersectionRatio: ratio,
            isIntersecting: ratio > 0,
          }) as IntersectionObserverEntry
      ),
      this as unknown as IntersectionObserver
    );
  }
}
const io = {
  /** [{title|id, ratio}] — 관찰 중인 요소 중 data-title 또는 id가 같은 것에 보고한다 */
  report(items: { title?: string; id?: string; ratio: number }[]) {
    for (const o of observers) {
      const entries = items.flatMap((it) => {
        const el = [...o.els].find((e) =>
          it.title !== undefined ? e.getAttribute('data-title') === it.title : e.id === it.id
        );
        return el ? [{ el, ratio: it.ratio }] : [];
      });
      if (entries.length) o.emit(entries);
    }
  },
};

let state: ReturnType<typeof useTopBarState>;
function Probe() {
  const s = useTopBarState();
  useEffect(() => {
    state = s;
  });
  return null;
}
function renderWithTopBar(ui: ReactNode) {
  return render(h(TopBarProvider, null, h(Probe), ui));
}

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIO);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const leaf = (props: { title: string; vellum?: boolean; free?: boolean }, children: ReactNode) =>
  h(Leaf, { ...props, children });
const stack = (...children: ReactNode[]) => h(LeafStack, { children });

describe('Leaves', () => {
  it('60% 넘게 보이는 가장 뒤의 장 제목이 상단 바 제목이 된다', () => {
    renderWithTopBar(
      h(Leaves, null, leaf({ title: '오늘' }, 'a'), leaf({ title: '지난 7일', vellum: true }, 'b'))
    );
    act(() =>
      io.report([
        { title: '오늘', ratio: 1 },
        { title: '지난 7일', ratio: 0.7 },
      ])
    );
    expect(state.leafTitle).toBe('지난 7일');
    expect(state.scrolled).toBe(true);
  });

  it('보이는 장이 없으면 첫 장이 현재이고 scrolled는 false', () => {
    renderWithTopBar(
      h(Leaves, null, leaf({ title: '오늘' }, 'a'), leaf({ title: '지난 7일' }, 'b'))
    );
    act(() =>
      io.report([
        { title: '오늘', ratio: 0.3 },
        { title: '지난 7일', ratio: 0.5 },
      ])
    );
    expect(state.leafTitle).toBe('오늘');
    expect(state.scrolled).toBe(false);
  });

  it('덮기(LeafStack) 안의 장도 같은 규칙으로 따른다', () => {
    renderWithTopBar(
      h(Leaves, null, stack(leaf({ title: '질문' }, 'a'), leaf({ title: '답', vellum: true }, 'b')))
    );
    act(() =>
      io.report([
        { title: '질문', ratio: 1 },
        { title: '답', ratio: 1 },
      ])
    );
    expect(state.leafTitle).toBe('답');
  });

  it('언마운트하면 제목과 scrolled를 되돌린다', () => {
    const tree = (withLeaves: boolean) =>
      h(
        TopBarProvider,
        null,
        h(Probe),
        withLeaves ? h(Leaves, null, leaf({ title: 'a' }, 'x'), leaf({ title: 'b' }, 'y')) : null
      );
    const r = render(tree(true));
    act(() => io.report([{ title: 'b', ratio: 1 }]));
    expect(state.leafTitle).toBe('b');
    expect(state.scrolled).toBe(true);
    r.rerender(tree(false));
    expect(state.leafTitle).toBeNull();
    expect(state.scrolled).toBe(false);
  });

  it('vellum 장은 vellum 클래스를, free 장은 leaf--free 클래스를 갖고 안쪽은 leaf-in', () => {
    renderWithTopBar(
      h(
        Leaves,
        null,
        leaf({ title: 'a', vellum: true }, h('p', null, '본문')),
        leaf({ title: 'b', free: true }, 'c')
      )
    );
    const first = screen.getByText('본문').closest('section')!;
    expect(first.classList.contains('vellum')).toBe(true);
    expect(first.classList.contains('leaf')).toBe(true);
    expect(screen.getByText('본문').parentElement!.classList.contains('leaf-in')).toBe(true);
    expect(screen.getByText('c').closest('section')!.classList.contains('leaf--free')).toBe(true);
  });
});

describe('LeafSwitch', () => {
  it('보이는 DesktopLeaf의 항목에 aria-current를 준다', () => {
    renderWithTopBar(
      h(
        'div',
        null,
        h(LeafSwitch, {
          label: '화면 전환',
          items: [
            { id: 'recent', label: '최근' },
            { id: 'all', label: '전체' },
          ],
        }),
        h(
          DesktopLeaves,
          null,
          h(DesktopLeaf, { id: 'recent', children: 'r' }),
          h(DesktopLeaf, { id: 'all', children: 'a' })
        )
      )
    );
    const nav = screen.getByRole('navigation', { name: '화면 전환' });
    expect(nav.querySelector('[aria-current="true"]')!.textContent).toBe('최근');
    act(() => io.report([{ id: 'all', ratio: 0.8 }]));
    const current = nav.querySelectorAll('[aria-current="true"]');
    expect(current.length).toBe(1);
    expect(current[0].textContent).toBe('전체');
  });
});
