// @vitest-environment jsdom
import { createElement as h } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api/fetch';
import { searchBook } from '@/lib/books/searchBook';
import KakaoBookSearchForm from '../KakaoBookSearchForm';

// 바코드 버튼은 콜백만 잡아 두고, 읽기 시작·끝을 테스트가 직접 일으킨다
const barcode: {
  onStart?: () => void;
  onIsbn?: (isbn: string) => void;
} = {};
vi.mock('@/components/books/BarcodeSearchButton', () => ({
  default: (props: { onStart?: () => void; onIsbn: (isbn: string) => void }) => {
    barcode.onStart = props.onStart;
    barcode.onIsbn = props.onIsbn;
    return null;
  },
}));
vi.mock('@/lib/books/searchBook', () => ({ searchBook: vi.fn() }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: vi.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}));
vi.mock('@/hooks/useCreationSubmission', () => ({
  useCreationSubmission: () => ({
    accountId: 'me',
    ready: true,
    snapshot: null,
    error: null,
    submit: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePrefetchDestination', () => ({ usePrefetchDestination: () => {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const book = (title: string, isbn: string) => ({
  title,
  authors: ['지은이'],
  publisher: '출판사',
  thumbnail: '',
  isbn,
  contents: '',
  datetime: '2021-01-01T00:00:00.000+09:00',
  url: `https://example.com/${isbn}`,
});

// jsdom에는 scrollIntoView가 없다 — 고른 책으로 스크롤하는 부분만 비운다
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
  vi.mocked(searchBook).mockReset();
  vi.mocked(apiFetch).mockReset();
});

async function searchFor(title: string, isbn: string) {
  vi.mocked(searchBook).mockResolvedValueOnce([book(title, isbn)]);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: title } });
  fireEvent.submit(screen.getByRole('searchbox').closest('form')!);
  await screen.findByRole('button', { name: new RegExp(title) });
}

describe('바코드를 읽는 사이 사용자가 다른 책을 골랐을 때', () => {
  it('늦게 온 바코드 결과는 고른 책을 바꾸지 않는다', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ totalPages: 300 })));
    render(h(KakaoBookSearchForm));
    await searchFor('먼저 찾은 책', '9788936434267');

    act(() => barcode.onStart?.());
    fireEvent.click(screen.getByRole('button', { name: /먼저 찾은 책/ }));
    await screen.findByRole('button', { name: '책장에 꽂기' });

    vi.mocked(searchBook).mockResolvedValueOnce([book('바코드 책', '9791160407273')]);
    await act(async () => barcode.onIsbn!('9791160407273'));

    expect(searchBook).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('searchbox')).toHaveProperty('value', '먼저 찾은 책');
    expect(screen.getByRole('button', { name: /먼저 찾은 책/, pressed: true })).toBeTruthy();
  });

  it('아무것도 하지 않았으면 한 권뿐인 결과를 바로 고른다', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ totalPages: 300 })));
    render(h(KakaoBookSearchForm));

    act(() => barcode.onStart?.());
    vi.mocked(searchBook).mockResolvedValueOnce([book('바코드 책', '9791160407273')]);
    await act(async () => barcode.onIsbn!('9791160407273'));

    expect(screen.getByRole('searchbox')).toHaveProperty('value', '9791160407273');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /바코드 책/, pressed: true })).toBeTruthy()
    );
  });
});
