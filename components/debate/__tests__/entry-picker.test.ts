// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EntryPicker from '../EntryPicker';

// vi.fn 대신 평범한 함수로 흉내 낸다(호출 기록은 배열에)
const bookCalls: unknown[][] = [];
const entryCalls: unknown[][] = [];
vi.mock('@/lib/debate/client', async (orig) => ({
  ...(await orig<typeof import('@/lib/debate/client')>()),
  fetchPickableBooks: async (q = '', page = 0) => {
    bookCalls.push([q, page]);
    if (page === 1) {
      return {
        items: [
          { userBookId: 'ub3', title: '오래된 책', author: null, coverUrl: null, quoteCount: 1 },
        ],
        next: null,
      };
    }
    const all = [
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
    return {
      items: all.filter((x) => x.title.includes(q)),
      next: q ? null : 1,
    };
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
    fireEvent.click(screen.getByRole('button', { name: '책 목록으로' }));
    expect(await screen.findByRole('button', { name: /소유냐 존재냐/ })).toBeTruthy();
  });

  it('검색어를 넣으면 모든 책에서 문장을 찾는다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(h(EntryPicker, { onPick: vi.fn() }));
    fireEvent.change(screen.getByLabelText('책 제목이나 문장으로 찾기'), {
      target: { value: '환상' },
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(await screen.findByText('찾은 문장')).toBeTruthy();
    expect(entryCalls.at(-1)).toEqual(['환상', 0, null]);
    vi.useRealTimers();
  });

  it('책이 많으면 아래 더 보기로 다음 책을 이어 붙인다', async () => {
    render(h(EntryPicker, { onPick: vi.fn() }));
    fireEvent.click(await screen.findByRole('button', { name: '책 더 보기' }));
    expect(await screen.findByRole('button', { name: /오래된 책/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /에로스의 종말/ })).toBeTruthy();
    expect(bookCalls).toEqual([
      ['', 0],
      ['', 1],
    ]);
    expect(screen.queryByRole('button', { name: '책 더 보기' })).toBeNull();
  });

  it('검색어는 책 제목과 문장을 함께 찾고, 찾은 책을 누르면 그 책으로 들어간다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(h(EntryPicker, { onPick: vi.fn() }));
    fireEvent.change(screen.getByLabelText('책 제목이나 문장으로 찾기'), {
      target: { value: '에로스' },
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(await screen.findByText('찾은 문장')).toBeTruthy();
    expect(bookCalls.at(-1)).toEqual(['에로스', 0]);
    expect(screen.queryByRole('button', { name: /소유냐 존재냐/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /에로스의 종말.*문장 12/ }));
    expect(await screen.findByText('그 책의 문장')).toBeTruthy();
    expect(entryCalls.at(-1)).toEqual(['', 0, 'ub1']);
    vi.useRealTimers();
  });
});
