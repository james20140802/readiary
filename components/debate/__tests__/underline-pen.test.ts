// @vitest-environment jsdom
import { createElement as h, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UnderlinePen from '../UnderlinePen';
import type { Range } from '@/lib/debate/types';

const QUOTE = '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.';

// 글자 i는 x = i 자리에 있다고 흉내 낸다. y > 100이면 문장 밖.
beforeEach(() => {
  document.elementFromPoint = (x: number, y: number) =>
    y > 100 ? document.body : document.querySelector(`[data-i="${Math.round(x)}"]`);
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      left: 0,
      right: 100,
      top: 0,
      bottom: 50,
      width: 100,
      height: 50,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;
});
afterEach(cleanup);

function Harness({ initial, spy }: { initial: Range[]; spy: (r: Range[]) => void }) {
  const [value, setValue] = useState(initial);
  return h(UnderlinePen, {
    quote: QUOTE,
    value,
    onChange: (next: Range[]) => {
      spy(next);
      setValue(next);
    },
  });
}

const sentence = () => screen.getByTestId('underline-sentence');
const down = (x: number, y = 10) =>
  fireEvent.pointerDown(sentence(), { pointerId: 1, clientX: x, clientY: y });
const move = (x: number, y = 10) =>
  fireEvent.pointerMove(sentence(), { pointerId: 1, clientX: x, clientY: y });
const up = (x: number, y = 10) =>
  fireEvent.pointerUp(sentence(), { pointerId: 1, clientX: x, clientY: y });

describe('UnderlinePen', () => {
  it('글자 위를 그으면 그 구간에 밑줄', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [], spy }));
    down(4);
    move(5);
    move(6);
    up(6);
    expect(spy).toHaveBeenLastCalledWith([{ start: 4, end: 6 }]);
    expect(screen.getByText('밑줄 1/3')).toBeTruthy();
  });

  it('문장 밖으로 빼서 떼면 취소', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [], spy }));
    down(4);
    move(6);
    move(6, 300);
    expect(screen.getByText('손을 떼면 취소돼요')).toBeTruthy();
    up(6, 300);
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByText('손을 떼면 취소돼요')).toBeNull();
  });

  it('그어 둔 밑줄에 걸치게 그으면 하나로 잇는다', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [{ start: 4, end: 6 }], spy }));
    down(0);
    move(3);
    move(6);
    up(6);
    expect(spy).toHaveBeenLastCalledWith([{ start: 0, end: 6 }]);
  });

  it('셋이 있으면 겹치지 않는 넷째는 막고 알린다', () => {
    const spy = vi.fn();
    render(
      h(Harness, {
        initial: [
          { start: 0, end: 2 },
          { start: 4, end: 6 },
          { start: 8, end: 11 },
        ],
        spy,
      })
    );
    down(17);
    up(17);
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText('밑줄은 3개까지예요. 하나를 지우고 그어요')).toBeTruthy();
  });

  it('그은 밑줄을 누르면 지울 수 있고, 되돌리기로 살린다', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [{ start: 4, end: 6 }], spy }));
    down(5);
    up(5);
    fireEvent.click(screen.getByRole('button', { name: '밑줄 지우기' }));
    expect(spy).toHaveBeenLastCalledWith([]);
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(spy).toHaveBeenLastCalledWith([{ start: 4, end: 6 }]);
  });

  it('밑줄 고른 상태에서 취소를 누르면 아무것도 바뀌지 않는다', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [{ start: 4, end: 6 }], spy }));
    down(5);
    up(5);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('button', { name: '밑줄 지우기' })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('밑줄마다 짧은 물음을 덧붙일 수 있다(선택)', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [{ start: 4, end: 6 }], spy }));
    fireEvent.change(screen.getByLabelText('“문턱이”에 묻고 싶은 것(선택)'), {
      target: { value: '왜 문턱일까요?' },
    });
    expect(spy).toHaveBeenLastCalledWith([{ start: 4, end: 6, prompt: '왜 문턱일까요?' }]);
  });

  it('한 번 누르면 그 어절에 밑줄', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [], spy }));
    down(5);
    up(5);
    expect(spy).toHaveBeenLastCalledWith([{ start: 4, end: 6 }]);
  });

  it('키보드: Shift+→로 넓히고 Enter로 긋는다, Esc는 취소', () => {
    const spy = vi.fn();
    render(h(Harness, { initial: [], spy }));
    const s = sentence();
    s.focus();
    fireEvent.keyDown(s, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(s, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(s, { key: 'Escape' });
    fireEvent.keyDown(s, { key: 'Enter' });
    expect(spy).toHaveBeenLastCalledWith([{ start: 0, end: 2 }]);
    fireEvent.keyDown(s, { key: 'ArrowRight' });
    fireEvent.keyDown(s, { key: 'ArrowRight' });
    fireEvent.keyDown(s, { key: 'ArrowRight' });
    fireEvent.keyDown(s, { key: 'ArrowRight' });
    fireEvent.keyDown(s, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(s, { key: 'Escape' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
