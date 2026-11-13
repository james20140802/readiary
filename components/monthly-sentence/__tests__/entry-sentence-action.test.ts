// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ownRow, res } from './fixtures';

const apiFetch = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (m: string, o?: unknown) => toastSuccess(m, o),
    error: (m: string) => toastError(m),
  },
}));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));

const { default: EntrySentenceAction } = await import('../EntrySentenceAction');

const onStart = vi.fn();
const onChange = vi.fn();
const show = (over: Record<string, unknown> = {}) =>
  render(
    h(EntrySentenceAction, {
      entryId: 'e1',
      date: '2026-09-14',
      quote: '문장',
      picked: false,
      today: '2026-11-13',
      onStart,
      onChange,
      ...over,
    })
  );

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('EntrySentenceAction', () => {
  it.each([null, '', '   \n'])('문장이 없는 기록(%j)에는 그리지 않는다', (quote) => {
    const { container } = show({ quote });
    expect(container.innerHTML).toBe('');
  });

  it('고르지 않은 기록은 "이달의 문장으로", 고른 기록은 "이달의 문장에서 내리기"', () => {
    const { rerender } = show();
    expect(screen.getByRole('button', { name: '이달의 문장으로' })).toBeTruthy();
    rerender(
      h(EntrySentenceAction, {
        entryId: 'e1',
        date: '2026-09-14',
        quote: '문장',
        picked: true,
        onStart,
        onChange,
      })
    );
    expect(screen.getByRole('button', { name: '이달의 문장에서 내리기' })).toBeTruthy();
  });

  it('누르면 기록 날짜의 달로 고르고, 메뉴를 닫고, 결과를 알린다', async () => {
    apiFetch.mockResolvedValue(
      res({ row: ownRow('2026-09', { entryId: 'e1', source: 'picked' }) })
    );
    show();
    fireEvent.click(screen.getByRole('button', { name: '이달의 문장으로' }));
    expect(onStart).toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
    expect(apiFetch.mock.calls[0][0]).toBe('/api/monthly-sentences');
    expect(apiFetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ month: '2026-09', entryId: 'e1' });
    expect(toastSuccess).toHaveBeenCalledWith('9월의 문장으로 골랐어요', undefined);
  });

  it.each([
    ['other', '나만 보여요 · 친구에게는 다른 문장이 보여요'],
    ['none', '나만 보여요 · 친구에게는 이 달이 보이지 않아요'],
  ] as const)(
    '나만 보기 기록을 고르면 친구에게 어떻게 보일지(%s) 함께 알린다',
    async (fallback, text) => {
      apiFetch.mockResolvedValue(
        res({
          row: ownRow('2026-09', { source: 'picked', isPrivate: true, friendFallback: fallback }),
        })
      );
      show();
      fireEvent.click(screen.getByRole('button', { name: '이달의 문장으로' }));
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('9월의 문장으로 골랐어요', { description: text })
      );
    }
  );

  it('내리면 선택을 풀고 알린다', async () => {
    apiFetch.mockResolvedValue(res({ row: ownRow('2026-09', { source: 'auto' }) }));
    show({ picked: true });
    fireEvent.click(screen.getByRole('button', { name: '이달의 문장에서 내리기' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(false));
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ month: '2026-09', entryId: null });
    expect(toastSuccess).toHaveBeenCalledWith('9월의 문장에서 내렸어요', undefined);
  });

  it('저장하지 못하면 그대로 두고 알린다', async () => {
    apiFetch.mockResolvedValue(res({ error: 'x' }, false));
    show();
    fireEvent.click(screen.getByRole('button', { name: '이달의 문장으로' }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.')
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('일기장에 보이지 않는 달(24개월보다 오래됨)의 기록에는 그리지 않는다', () => {
    const { container } = show({ date: '2024-11-30' });
    expect(container.innerHTML).toBe('');
  });

  it('누르는 사이 다시 눌러도 한 번만 저장한다', async () => {
    apiFetch.mockImplementation(() => new Promise<Response>(() => {}));
    show();
    const button = screen.getByRole('button', { name: '이달의 문장으로' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
