// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarcodePhotoError, readIsbnFromPhoto } from '@/lib/books/barcode';
import BarcodeSearchButton from '../BarcodeSearchButton';
import { SearchBox } from '../BookNewParts';

vi.mock('@/lib/books/barcode', () => ({
  readIsbnFromPhoto: vi.fn(),
  BarcodePhotoError: class BarcodePhotoError extends Error {},
}));

afterEach(() => {
  cleanup();
  vi.mocked(readIsbnFromPhoto).mockReset();
});

function pick(container: HTMLElement) {
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  const file = new File(['x'], 'back.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
}

function setup() {
  const onIsbn = vi.fn();
  const onMessage = vi.fn();
  const view = render(h(BarcodeSearchButton, { onIsbn, onMessage }));
  return { ...view, onIsbn, onMessage };
}

describe('바코드로 찾기', () => {
  it('아이콘 버튼에 이름이 있고, 읽은 ISBN을 넘긴다', async () => {
    vi.mocked(readIsbnFromPhoto).mockResolvedValue('9788936434267');
    const { container, onIsbn, onMessage } = setup();
    expect(screen.getByRole('button', { name: '바코드로 찾기' })).toBeTruthy();
    pick(container);
    await waitFor(() => expect(onIsbn).toHaveBeenCalledWith('9788936434267'));
    expect(onMessage).toHaveBeenLastCalledWith(null);
  });

  it('책 바코드가 없으면 다시 찍도록 안내한다', async () => {
    vi.mocked(readIsbnFromPhoto).mockResolvedValue(null);
    const { container, onIsbn, onMessage } = setup();
    pick(container);
    await waitFor(() =>
      expect(onMessage).toHaveBeenLastCalledWith(expect.stringContaining('다시 찍어'))
    );
    expect(onIsbn).not.toHaveBeenCalled();
  });

  it('열 수 없는 사진은 다른 사진을 고르도록 안내한다', async () => {
    vi.mocked(readIsbnFromPhoto).mockRejectedValue(new BarcodePhotoError());
    const { container, onMessage } = setup();
    pick(container);
    await waitFor(() =>
      expect(onMessage).toHaveBeenLastCalledWith(expect.stringContaining('다른 사진'))
    );
  });

  it('판독기를 못 불러오면 잠시 뒤 다시 하도록 안내한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(readIsbnFromPhoto).mockRejectedValue(new Error('wasm'));
    const { container, onMessage } = setup();
    pick(container);
    await waitFor(() =>
      expect(onMessage).toHaveBeenLastCalledWith(expect.stringContaining('잠시 뒤'))
    );
  });

  it('검색줄 안, 찾기 앞에 놓이고 안내는 status로 읽힌다', () => {
    render(
      h(SearchBox, {
        value: '',
        onChange: () => {},
        onSubmit: () => {},
        trailing: h('button', { type: 'button' }, 'B'),
        status: '책 바코드를 찾지 못했어요.',
      })
    );
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['B', '찾기']);
    expect(screen.getByRole('status').textContent).toBe('책 바코드를 찾지 못했어요.');
  });
});
