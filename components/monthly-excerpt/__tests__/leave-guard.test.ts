// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLeaveGuard } from '../useLeaveGuard';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

const back = () =>
  new Promise<void>((resolve) => {
    window.addEventListener('popstate', () => resolve(), { once: true });
    window.history.back();
  });

const guardHook = (initial: boolean) =>
  renderHook(({ active }) => useLeaveGuard(active, '/excerpts'), {
    initialProps: { active: initial },
  });

let before: number;
beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  window.history.pushState({}, '', '/excerpts/2026-03/compose');
  before = window.history.length;
});
afterEach(cleanup);

describe('useLeaveGuard', () => {
  it('작업 중이 아니면 히스토리를 건드리지 않는다', () => {
    guardHook(false);
    expect(window.history.length).toBe(before);
  });

  it('작업 중 뒤로 가면 확인을 열고, 머물면 보초를 다시 쌓는다', async () => {
    const { result } = guardHook(true);
    expect(window.history.length).toBe(before + 1);

    await act(back);
    expect(result.current.pending).toEqual({ kind: 'back' });

    act(() => result.current.stay());
    expect(result.current.pending).toBeNull();
    expect(window.history.state.__readiaryLeaveGuard).toBe(true);

    // 다시 뒤로 가도 또 확인을 연다
    await act(back);
    expect(result.current.pending).toEqual({ kind: 'back' });
  });

  it('나가면 한 칸 더 뒤로 간다', async () => {
    const { result } = guardHook(true);
    await act(back);
    const popped = new Promise((r) => window.addEventListener('popstate', r, { once: true }));
    await act(async () => {
      await result.current.leave();
      await popped;
    });
    expect(window.history.state?.__readiaryLeaveGuard).toBeUndefined();
    expect(push).not.toHaveBeenCalled();
  });

  it('뒤로 갈 곳이 없으면 나가기가 대체 주소로 간다', async () => {
    const { result } = guardHook(true);
    await act(back);
    vi.useFakeTimers();
    const noop = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    try {
      await act(async () => {
        await result.current.leave();
      });
      act(() => vi.advanceTimersByTime(800));
      expect(replace).toHaveBeenCalledWith('/excerpts');
    } finally {
      noop.mockRestore();
      vi.useRealTimers();
    }
  });

  it('작업을 되돌리면 보초를 걷어 다음 뒤로 가기가 바로 떠난다', async () => {
    const { result, rerender } = guardHook(true);
    const popped = new Promise((r) => window.addEventListener('popstate', r, { once: true }));
    rerender({ active: false });
    await act(async () => {
      await popped;
    });
    expect(window.history.state?.__readiaryLeaveGuard).toBeUndefined();
    expect(result.current.pending).toBeNull();
  });

  it('release는 보초를 걷은 뒤 풀리고, 그 뒤로는 확인을 열지 않는다', async () => {
    const { result } = guardHook(true);
    await act(async () => {
      await result.current.release();
    });
    expect(window.history.state?.__readiaryLeaveGuard).toBeUndefined();
    await act(back);
    expect(result.current.pending).toBeNull();
  });

  it('링크 확인에서 나가면 보초를 걷고 그 주소로 간다', async () => {
    const { result } = guardHook(true);
    const a = document.createElement('a');
    a.href = '/books';
    document.body.append(a);
    act(() => a.click());
    expect(result.current.pending).toEqual({ kind: 'link', href: '/books' });
    await act(async () => {
      await result.current.leave();
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/books'));
    expect(window.history.state?.__readiaryLeaveGuard).toBeUndefined();
    a.remove();
  });
});
