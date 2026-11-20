// @vitest-environment jsdom
import { createElement as h } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhotoWord } from '@/lib/photo-quote/types';
import PickStage from '../PickStage';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const words: PhotoWord[] = [
  { text: '책을', box: [10, 10, 60, 30], sep: ' ' },
  { text: '읽는', box: [70, 10, 120, 30], sep: ' ' },
  { text: '일', box: [130, 10, 180, 30], sep: '' },
];

// 판 300×400에 사진 300×400 — 화면 좌표가 곧 사진 좌표다
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 300,
    bottom: 400,
    width: 300,
    height: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(range: [number, number] | null = null) {
  const onRange = vi.fn();
  const view = render(
    h(PickStage, { src: 'blob:x', image: { w: 300, h: 400 }, words, range, onRange })
  );
  const stage = view.getByRole('application', { name: '사진에서 문장 고르기' });
  const at = (x: number, y: number, pointerType: string, pointerId = 1) => ({
    clientX: x,
    clientY: y,
    pointerType,
    pointerId,
    button: 0,
  });
  return { ...view, stage, onRange, at };
}

describe('PickStage', () => {
  it('마우스는 낱말 위에서 누른 채 끌면 바로 고른다', () => {
    const { stage, onRange, at } = setup();
    fireEvent.pointerDown(stage, at(20, 20, 'mouse'));
    expect(onRange).toHaveBeenLastCalledWith([0, 0]);
    fireEvent.pointerMove(stage, at(150, 20, 'mouse'));
    expect(onRange).toHaveBeenLastCalledWith([0, 2]);
    fireEvent.pointerUp(stage, at(150, 20, 'mouse'));
    expect(onRange).toHaveBeenLastCalledWith([0, 2]);
  });

  it('마우스로 뒤에서 앞으로 끌어도 놓으면 앞뒤 순서로 정리된다', () => {
    const { stage, onRange, at } = setup();
    fireEvent.pointerDown(stage, at(150, 20, 'mouse'));
    fireEvent.pointerMove(stage, at(20, 20, 'mouse'));
    fireEvent.pointerUp(stage, at(20, 20, 'mouse'));
    expect(onRange).toHaveBeenLastCalledWith([0, 2]);
  });

  it('마우스로 빈 곳을 끌면 고르지 않고 옮긴다', () => {
    const { stage, onRange, at } = setup();
    fireEvent.pointerDown(stage, at(150, 300, 'mouse'));
    fireEvent.pointerMove(stage, at(150, 200, 'mouse'));
    fireEvent.pointerUp(stage, at(150, 200, 'mouse'));
    expect(onRange).not.toHaveBeenCalled();
  });

  it('손가락은 0.32초 누르고 있어야 고르기가 시작된다', () => {
    const { stage, onRange, at } = setup();
    fireEvent.pointerDown(stage, at(20, 20, 'touch'));
    act(() => void vi.advanceTimersByTime(300));
    expect(onRange).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(30));
    expect(onRange).toHaveBeenLastCalledWith([0, 0]);
    fireEvent.pointerMove(stage, at(150, 20, 'touch'));
    expect(onRange).toHaveBeenLastCalledWith([0, 2]);
    fireEvent.pointerUp(stage, at(150, 20, 'touch'));
    expect(onRange).toHaveBeenLastCalledWith([0, 2]);
  });

  it('손가락을 금방 떼면 고르지 않는다', () => {
    const { stage, onRange, at } = setup();
    fireEvent.pointerDown(stage, at(20, 20, 'touch'));
    act(() => void vi.advanceTimersByTime(100));
    fireEvent.pointerUp(stage, at(20, 20, 'touch'));
    act(() => void vi.advanceTimersByTime(500));
    expect(onRange).not.toHaveBeenCalled();
  });

  it('손가락으로 누르자마자 움직이면 옮기기이고 고르지 않는다', () => {
    const { stage, onRange, at } = setup();
    fireEvent.pointerDown(stage, at(20, 20, 'touch'));
    fireEvent.pointerMove(stage, at(20, 45, 'touch'));
    act(() => void vi.advanceTimersByTime(500));
    expect(onRange).not.toHaveBeenCalled();
  });

  it('두 손가락을 대면 고르기를 시작하지 않는다', () => {
    const { stage, onRange, at } = setup();
    fireEvent.pointerDown(stage, at(20, 20, 'touch', 1));
    fireEvent.pointerDown(stage, at(120, 220, 'touch', 2));
    act(() => void vi.advanceTimersByTime(500));
    expect(onRange).not.toHaveBeenCalled();
  });

  it('고른 구간의 양 끝에 손잡이를 그리고, 끝 손잡이를 끌면 구간이 늘어난다', () => {
    const { container, stage, onRange, at } = setup([0, 1]);
    const knobs = container.querySelectorAll('[data-knob]');
    expect([...knobs].map((k) => k.getAttribute('data-knob'))).toEqual(['start', 'end']);
    fireEvent.pointerDown(knobs[1], at(120, 42, 'touch'));
    fireEvent.pointerMove(stage, at(150, 20, 'touch'));
    expect(onRange).toHaveBeenLastCalledWith([0, 2]);
  });

  it('시작 손잡이를 끝 너머로 끌면 구간이 뒤집혀 정리된다', () => {
    const { container, stage, onRange, at } = setup([0, 1]);
    const start = container.querySelector('[data-knob="start"]')!;
    fireEvent.pointerDown(start, at(10, 42, 'touch'));
    fireEvent.pointerMove(stage, at(150, 20, 'touch'));
    fireEvent.pointerUp(stage, at(150, 20, 'touch'));
    expect(onRange).toHaveBeenLastCalledWith([1, 2]);
  });

  it('낱말이 없으면 눌러도 아무 일도 없다', () => {
    const onRange = vi.fn();
    const view = render(
      h(PickStage, { src: 'blob:x', image: { w: 300, h: 400 }, words: [], range: null, onRange })
    );
    const stage = view.getByRole('application');
    fireEvent.pointerDown(stage, { clientX: 20, clientY: 20, pointerType: 'touch', pointerId: 1 });
    act(() => void vi.advanceTimersByTime(500));
    expect(onRange).not.toHaveBeenCalled();
  });

  it('키보드 +로 키우고 -로 줄인다', () => {
    const { container, stage } = setup();
    const inner = container.querySelector('[data-pick-inner]') as HTMLElement;
    const before = inner.style.transform;
    fireEvent.keyDown(stage, { key: '+' });
    expect(inner.style.transform).not.toBe(before);
    expect(inner.style.transform).toContain('scale(1.5)');
    fireEvent.keyDown(stage, { key: '-' });
    expect(inner.style.transform).toContain('scale(1)');
  });
});
