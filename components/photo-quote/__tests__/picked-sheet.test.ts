// @vitest-environment jsdom
import { createElement as h, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PickedSheet from '../PickedSheet';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

/** 시트가 접힌 높이(96)보다 얼마나 큰가 — jsdom은 높이를 재지 못하므로 정해 준다 */
let height = 396;
beforeEach(() => {
  height = 396;
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Harness({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return h(
    PickedSheet,
    { text, expanded, onExpanded: setExpanded },
    h('p', { role: 'status' }, '안내')
  );
}

const grip = () => screen.getByRole('button', { name: /고른 문장/ });
const sheet = () => screen.getByTestId('picked-sheet');
/** fireEvent는 timeStamp를 덮어쓰지 못한다 — 직접 정해 준다 */
function pointer(type: string, target: Element, y: number, time: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: 100, clientY: y, button: 0 });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'touch' },
    // React는 timeStamp가 0이면 지금 시각으로 바꾼다 — 0을 피한다
    timeStamp: { value: time + 1000 },
  });
  fireEvent(target, event);
}

describe('고른 문장 시트', () => {
  it('고른 글이 없으면 안내를 보이고 펼치는 손잡이가 없다', () => {
    render(h(Harness, { text: '' }));
    expect(screen.getByRole('status').textContent).toBe('안내');
    expect(screen.queryByRole('button', { name: /고른 문장/ })).toBeNull();
  });

  it('글이 접힌 높이에 다 들어가면 손잡이가 없다', () => {
    height = 96;
    render(h(Harness, { text: '짧은 문장' }));
    expect(screen.getByText('짧은 문장')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /고른 문장/ })).toBeNull();
  });

  it('긴 글은 손잡이로 펼치고 다시 접는다', () => {
    render(h(Harness, { text: '긴 문장' }));
    expect(grip().getAttribute('aria-expanded')).toBe('false');
    expect(sheet().style.transform).toBe('translateY(0px)');
    fireEvent.click(grip());
    expect(grip().getAttribute('aria-expanded')).toBe('true');
    expect(grip().getAttribute('aria-label')).toBe('고른 문장 접기');
    expect(sheet().style.transform).toBe('translateY(-300px)');
    fireEvent.click(grip());
    expect(grip().getAttribute('aria-expanded')).toBe('false');
  });

  it('끌어 올리면 손가락을 따라오다가 놓으면 펼쳐지고, 끌어 내리면 접힌다', () => {
    render(h(Harness, { text: '긴 문장' }));
    pointer('pointerdown', sheet(), 500, 0);
    pointer('pointermove', sheet(), 400, 400);
    expect(sheet().style.transform).toBe('translateY(-100px)');
    pointer('pointermove', sheet(), 300, 800);
    pointer('pointerup', sheet(), 300, 2000);
    expect(grip().getAttribute('aria-expanded')).toBe('true');
    expect(sheet().style.transform).toBe('translateY(-300px)');

    pointer('pointerdown', grip(), 200, 3000);
    pointer('pointermove', grip(), 420, 3400);
    pointer('pointerup', grip(), 420, 5000);
    expect(grip().getAttribute('aria-expanded')).toBe('false');
    expect(sheet().style.transform).toBe('translateY(0px)');
  });

  it('조금만 천천히 끌다 놓으면 제자리로 돌아간다', () => {
    render(h(Harness, { text: '긴 문장' }));
    pointer('pointerdown', sheet(), 500, 0);
    pointer('pointermove', sheet(), 460, 1000);
    pointer('pointerup', sheet(), 460, 2000);
    expect(grip().getAttribute('aria-expanded')).toBe('false');
    expect(sheet().style.transform).toBe('translateY(0px)');
  });

  it('짧게 튕겨 올려도 펼쳐진다', () => {
    render(h(Harness, { text: '긴 문장' }));
    pointer('pointerdown', sheet(), 500, 0);
    pointer('pointermove', sheet(), 460, 60);
    pointer('pointerup', sheet(), 460, 80);
    expect(grip().getAttribute('aria-expanded')).toBe('true');
  });

  it('접힌 시트를 두드리면 펼쳐지고, 펼친 글을 두드려도 접히지 않는다', () => {
    render(h(Harness, { text: '긴 문장' }));
    const text = screen.getByText('긴 문장');
    pointer('pointerdown', text, 500, 0);
    pointer('pointerup', text, 500, 50);
    expect(grip().getAttribute('aria-expanded')).toBe('true');
    pointer('pointerdown', text, 300, 1000);
    pointer('pointerup', text, 300, 1050);
    expect(grip().getAttribute('aria-expanded')).toBe('true');
  });

  it('끝을 넘겨 끌면 덜 따라온다', () => {
    render(h(Harness, { text: '긴 문장' }));
    pointer('pointerdown', sheet(), 500, 0);
    pointer('pointermove', sheet(), 600, 400);
    const y = Number(/translateY\((-?[\d.]+)px\)/.exec(sheet().style.transform)![1]);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(40);
  });
});
