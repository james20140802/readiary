// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.fn();
const toastSuccess = vi.fn();
const saved = vi.fn();
const refresh = vi.fn();
const updates: unknown[] = [];
const filters: unknown[] = [];

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({
  toast: {
    success: (m: string, o?: unknown) => toastSuccess(m, o),
    error: (m: string) => toastError(m),
  },
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({
    from: (table: string) => ({
      update: (values: unknown) => {
        updates.push([table, values]);
        return {
          eq: (column: string, value: unknown) => {
            filters.push([column, value]);
            return { select: () => ({ single: () => saved() }) };
          },
        };
      },
    }),
  }),
}));

const { default: EntryCoverAction } = await import('../EntryCoverAction');

const onStart = vi.fn();
const onChange = vi.fn();
const props = (over: Record<string, unknown> = {}) => ({
  entryId: 'e1',
  userId: 'me',
  quote: '문장',
  isPrivate: false,
  picked: false,
  onStart,
  onChange,
  ...over,
});
const show = (over: Record<string, unknown> = {}) => render(h(EntryCoverAction, props(over)));

beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  filters.length = 0;
  saved.mockResolvedValue({ data: { id: 'me' }, error: null });
});
afterEach(cleanup);

describe('EntryCoverAction', () => {
  it.each([null, '', '   \n'])('문장이 없는 기록(%j)에는 그리지 않는다', (quote) => {
    expect(show({ quote }).container.innerHTML).toBe('');
  });

  it('누구의 기록인지 모르면 그리지 않는다', () => {
    expect(show({ userId: undefined }).container.innerHTML).toBe('');
  });

  it('표지 문장이 아니면 올리는 줄, 표지 문장이면 내리는 줄', () => {
    const { rerender } = show();
    expect(screen.getByRole('button', { name: '내 책의 표지 문장으로' })).toBeTruthy();
    rerender(h(EntryCoverAction, props({ picked: true })));
    expect(screen.getByRole('button', { name: '표지 문장에서 내리기' })).toBeTruthy();
  });

  it('올리면 내 프로필에 이 기록을 저장하고 알린다', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: '내 책의 표지 문장으로' }));
    expect(onStart).toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
    expect(updates).toEqual([['profiles', { featured_entry_id: 'e1' }]]);
    expect(filters).toEqual([['id', 'me']]);
    expect(toastSuccess).toHaveBeenCalledWith('표지 문장으로 골랐어요', undefined);
    // 이미 다녀온 프로필 화면이 옛 표지를 들고 있지 않게 한다
    expect(refresh).toHaveBeenCalled();
  });

  it('나만 보기 기록을 올리면 친구에게는 보이지 않는다고 알린다', async () => {
    show({ isPrivate: true });
    fireEvent.click(screen.getByRole('button', { name: '내 책의 표지 문장으로' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
    expect(toastSuccess).toHaveBeenCalledWith('표지 문장으로 골랐어요', {
      description: '나만 보여요 · 친구에게는 표지 문장이 보이지 않아요',
    });
  });

  it('내리면 표지 문장을 비운다', async () => {
    show({ picked: true });
    fireEvent.click(screen.getByRole('button', { name: '표지 문장에서 내리기' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(false));
    expect(updates).toEqual([['profiles', { featured_entry_id: null }]]);
    expect(toastSuccess).toHaveBeenCalledWith('표지 문장에서 내렸어요', undefined);
  });

  it('저장하지 못하면 상태를 바꾸지 않고 알린다', async () => {
    saved.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    show();
    fireEvent.click(screen.getByRole('button', { name: '내 책의 표지 문장으로' }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        '표지 문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.'
      )
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('저장하는 동안 다시 눌러도 한 번만 저장한다', async () => {
    let finish: (v: unknown) => void = () => {};
    saved.mockImplementation(() => new Promise((r) => (finish = r)));
    show();
    const button = screen.getByRole('button', { name: '내 책의 표지 문장으로' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(updates).toHaveLength(1);
    finish({ data: { id: 'me' }, error: null });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  });
});
