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

const { default: BookBookmarkAction } = await import('../BookBookmarkAction');

const onStart = vi.fn();
const onChange = vi.fn();
const props = (over: Record<string, unknown> = {}) => ({
  userBookId: 'ub1',
  userId: 'me',
  picked: false,
  onStart,
  onChange,
  ...over,
});
const show = (over: Record<string, unknown> = {}) => render(h(BookBookmarkAction, props(over)));

beforeEach(() => {
  vi.clearAllMocks();
  updates.length = 0;
  filters.length = 0;
  saved.mockResolvedValue({ data: { id: 'me' }, error: null });
});
afterEach(cleanup);

describe('BookBookmarkAction', () => {
  it('누구의 책인지 모르면 그리지 않는다', () => {
    expect(show({ userId: undefined }).container.innerHTML).toBe('');
  });

  it('책갈피가 없으면 꽂는 줄, 꽂혀 있으면 빼는 줄', () => {
    const { rerender } = show();
    expect(screen.getByRole('button', { name: '책갈피 꽂기' })).toBeTruthy();
    rerender(h(BookBookmarkAction, props({ picked: true })));
    expect(screen.getByRole('button', { name: '책갈피 빼기' })).toBeTruthy();
  });

  it('꽂으면 내 프로필에 이 책을 저장하고 알린다', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: '책갈피 꽂기' }));
    expect(onStart).toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
    expect(updates).toEqual([['profiles', { bookmark_user_book_id: 'ub1' }]]);
    expect(filters).toEqual([['id', 'me']]);
    expect(toastSuccess).toHaveBeenCalledWith('이 책에 책갈피를 꽂았어요', undefined);
    expect(refresh).toHaveBeenCalled();
  });

  it('빼면 책갈피를 비운다', async () => {
    show({ picked: true });
    fireEvent.click(screen.getByRole('button', { name: '책갈피 빼기' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(false));
    expect(updates).toEqual([['profiles', { bookmark_user_book_id: null }]]);
    expect(toastSuccess).toHaveBeenCalledWith('책갈피를 뺐어요', undefined);
  });

  it('저장하지 못하면 상태를 바꾸지 않고 알린다', async () => {
    saved.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    show();
    fireEvent.click(screen.getByRole('button', { name: '책갈피 꽂기' }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('책갈피를 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.')
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('저장하는 동안 다시 눌러도 한 번만 저장한다', async () => {
    let finish: (v: unknown) => void = () => {};
    saved.mockImplementation(() => new Promise((r) => (finish = r)));
    show();
    const button = screen.getByRole('button', { name: '책갈피 꽂기' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(updates).toHaveLength(1);
    finish({ data: { id: 'me' }, error: null });
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  });
});
