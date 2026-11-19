// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EntryPicker from '../EntryPicker';

// vi.fn 대신 평범한 함수로 흉내 낸다(호출 기록은 배열에)
const bookCalls: unknown[] = [];
const entryCalls: unknown[][] = [];
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  fetchPickableBooks: async () => {
    bookCalls.push(1);
    return [
      {
        userBookId: 'ub1',
        title: '에로스의 종말',
        author: '한병철',
        coverUrl: null,
        quoteCount: 12,
      },
      {
        userBookId: 'ub2',
        title: '소유냐 존재냐',
        author: '에리히 프롬',
        coverUrl: null,
        quoteCount: 3,
      },
    ];
  },
  fetchPickableEntries: async (q: string, page: number, book?: string | null) => {
    entryCalls.push([q, page, book ?? null]);
    return {
      items: [
        {
          id: 'e1',
          quote: book ? '그 책의 문장' : '찾은 문장',
          isPrivate: false,
          bookTitle: '에로스의 종말',
          bookAuthor: '한병철',
        },
      ],
      next: null,
    };
  },
}));

beforeEach(() => {
  bookCalls.length = 0;
  entryCalls.length = 0;
});
afterEach(cleanup);

describe('EntryPicker — 책을 먼저 고르고 그 책의 문장을 고른다', () => {
  it('처음엔 문장이 있는 책 목록', async () => {
    render(h(EntryPicker, { onPick: vi.fn() }));
    expect(await screen.findByRole('button', { name: /에로스의 종말/ })).toBeTruthy();
    expect(screen.getByText('문장 12')).toBeTruthy();
    expect(entryCalls).toHaveLength(0);
  });

  it('책을 누르면 그 책의 문장, 책 목록으로 돌아갈 수 있다', async () => {
    const onPick = vi.fn();
    render(h(EntryPicker, { onPick }));
    fireEvent.click(await screen.findByRole('button', { name: /에로스의 종말/ }));
    expect(await screen.findByText('그 책의 문장')).toBeTruthy();
    expect(entryCalls.at(-1)).toEqual(['', 0, 'ub1']);
    fireEvent.click(screen.getByText('그 책의 문장'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
    fireEvent.click(screen.getByRole('button', { name: '책 목록' }));
    expect(await screen.findByRole('button', { name: /소유냐 존재냐/ })).toBeTruthy();
  });

  it('검색어를 넣으면 모든 책에서 문장을 찾는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(h(EntryPicker, { onPick: vi.fn() }));
    fireEvent.change(screen.getByLabelText('문장 찾기'), { target: { value: '환상' } });
    await vi.advanceTimersByTimeAsync(300);
    expect(await screen.findByText('찾은 문장')).toBeTruthy();
    expect(entryCalls.at(-1)).toEqual(['환상', 0, null]);
    vi.useRealTimers();
  });
});
