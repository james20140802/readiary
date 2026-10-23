// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({ rpc }) }));
vi.mock('html-to-image', () => ({ toPng: vi.fn(async () => 'data:image/png;base64,AA==') }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ShareEntrySheet from '../ShareEntrySheet';

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  onchange: null,
  dispatchEvent: () => false,
}));
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const writeText = vi.fn(async () => {});

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ blob: async () => new Blob(['x']) }))
  );
  HTMLAnchorElement.prototype.click = vi.fn();
});
afterEach(cleanup);

const props = {
  open: true,
  onClose: () => {},
  entryId: 'e1',
  quote: '문장',
  note: null,
  date: '2026-10-20',
  bookTitle: '책',
};

describe('ShareEntrySheet', () => {
  it('이미지 저장은 그림만 내려받고 공유 링크를 열지 않는다', async () => {
    render(h(ShareEntrySheet, props));
    fireEvent.click(screen.getByRole('button', { name: '이미지 저장' }));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(rpc).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('공유하기는 공유 링크를 연다', async () => {
    render(h(ShareEntrySheet, props));
    fireEvent.click(screen.getByRole('button', { name: '공유하기' }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('enable_entry_share', { p_entry_id: 'e1' })
    );
  });
});
