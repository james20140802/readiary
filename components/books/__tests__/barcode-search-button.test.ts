// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarcodePhotoError, readIsbnFromPhoto } from '@/lib/books/barcode';
import BarcodeSearchButton from '../BarcodeSearchButton';

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

describe('바코드로 찾기', () => {
  it('읽은 ISBN을 넘긴다', async () => {
    vi.mocked(readIsbnFromPhoto).mockResolvedValue('9788936434267');
    const onIsbn = vi.fn();
    const { container } = render(h(BarcodeSearchButton, { onIsbn }));
    expect(screen.getByRole('button', { name: '바코드로 찾기' })).toBeTruthy();
    pick(container);
    await waitFor(() => expect(onIsbn).toHaveBeenCalledWith('9788936434267'));
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('책 바코드가 없으면 다시 찍도록 안내한다', async () => {
    vi.mocked(readIsbnFromPhoto).mockResolvedValue(null);
    const onIsbn = vi.fn();
    const { container } = render(h(BarcodeSearchButton, { onIsbn }));
    pick(container);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('다시 찍어'));
    expect(onIsbn).not.toHaveBeenCalled();
  });

  it('열 수 없는 사진은 다른 사진을 고르도록 안내한다', async () => {
    vi.mocked(readIsbnFromPhoto).mockRejectedValue(new BarcodePhotoError());
    const { container } = render(h(BarcodeSearchButton, { onIsbn: vi.fn() }));
    pick(container);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('다른 사진'));
  });

  it('판독기를 못 불러오면 잠시 뒤 다시 하도록 안내한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(readIsbnFromPhoto).mockRejectedValue(new Error('wasm'));
    const { container } = render(h(BarcodeSearchButton, { onIsbn: vi.fn() }));
    pick(container);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('잠시 뒤'));
  });
});
