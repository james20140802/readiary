// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({ rpc }) }));
const toPng = vi.hoisted(() => vi.fn(async () => 'data:image/png;base64,AA=='));
vi.mock('html-to-image', () => ({ toPng }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

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
  toPng.mockClear();
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ blob: async () => new Blob(['x']) }))
  );
  HTMLAnchorElement.prototype.click = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:card');
  URL.revokeObjectURL = vi.fn();
  toast.success.mockClear();
  toast.error.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // @ts-expect-error 테스트에서만 붙였다 뗀다
  delete navigator.share;
  // @ts-expect-error 테스트에서만 붙였다 뗀다
  delete navigator.canShare;
});

const props = {
  open: true,
  onClose: () => {},
  entryId: 'e1',
  quote: '문장',
  note: null,
  date: '2026-10-20',
  bookTitle: '책',
};

const SHARE_URL = `${window.location.origin}/share/e/e1`;

describe('ShareEntrySheet', () => {
  it('링크 복사는 공유를 켠 뒤 주소만 복사한다', async () => {
    render(h(ShareEntrySheet, props));
    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(SHARE_URL));
    expect(rpc).toHaveBeenCalledWith('enable_entry_share', { p_entry_id: 'e1' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('링크를 복사했어요.');
  });

  it('ClipboardItem이 있으면 공유가 켜진 뒤의 주소를 약속으로 넘긴다', async () => {
    const write = vi.fn(async (items: { data: Record<string, Promise<Blob>> }[]) => {
      const blob = await items[0].data['text/plain'];
      expect(await blob.text()).toBe(SHARE_URL);
    });
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public data: Record<string, Promise<Blob>>) {}
      }
    );
    Object.defineProperty(navigator, 'clipboard', {
      value: { write, writeText },
      configurable: true,
    });
    render(h(ShareEntrySheet, props));
    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('링크를 복사했어요.'));
    expect(write).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('공유를 켜지 못하면 아무것도 복사하지 않는다', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    render(h(ShareEntrySheet, props));
    fireEvent.click(screen.getByRole('button', { name: '링크 복사' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('공유 링크를 만들지 못했어요.'));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('공유 창이 파일을 받으면 그림만 보내고 링크는 열지 않는다', async () => {
    const share = vi.fn(async () => {});
    Object.assign(navigator, { share, canShare: () => true });
    render(h(ShareEntrySheet, props));
    const button = await screen.findByRole('button', { name: '이미지로 공유' });
    fireEvent.click(button);
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const data = (share.mock.calls[0] as unknown as [ShareData])[0];
    expect(Object.keys(data)).toEqual(['files']);
    expect(data.files?.[0]).toBeInstanceOf(File);
    expect(rpc).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  describe('카드 이미지', () => {
    const quote = '긴 문장의 첫머리\n'.repeat(40) + '마지막 줄';
    const note = '생각의 첫머리\n'.repeat(20) + '생각의 마지막 줄';
    const captureCard = () => document.querySelector<HTMLElement>('[style*="540"]')!;
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetHeight'
    )!;
    afterEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    });
    /** 이 글자 크기가 되어야 4:5에 들어간다고 꾸민다 */
    const fitsAt = (fontSize: string) =>
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) {
          return this.querySelector('blockquote')?.style.fontSize === fontSize ? 675 : 900;
        },
      });

    it('문장과 생각을 줄 수로 자르지 않고 끝까지 담는다', async () => {
      render(h(ShareEntrySheet, { ...props, quote, note }));
      await waitFor(() => expect(toPng).toHaveBeenCalled());
      const card = captureCard();
      expect(card.innerHTML).not.toContain('line-clamp');
      expect(card.textContent).toContain('마지막 줄');
      expect(card.textContent).toContain('생각의 마지막 줄');
    });

    it('4:5에 넘치면 들어가는 크기까지 글자를 줄여 찍는다', async () => {
      fitsAt('19px');
      render(h(ShareEntrySheet, { ...props, quote }));
      await waitFor(() => expect(toPng).toHaveBeenCalled());
      expect(captureCard().querySelector('blockquote')?.style.fontSize).toBe('19px');
    });

    it('높이를 고정하지 않아 가장 작은 글자로도 넘치면 카드가 길어진다', async () => {
      fitsAt('never');
      render(h(ShareEntrySheet, { ...props, quote }));
      await waitFor(() => expect(toPng).toHaveBeenCalled());
      const card = captureCard();
      expect(card.style.height).toBe('');
      expect(card.style.minHeight).toBe('675px');
      expect(card.className).not.toContain('overflow-hidden');
    });

    it('웹폰트가 빠진 첫 캡처는 버리고 두 번째 그림을 쓴다', async () => {
      render(h(ShareEntrySheet, props));
      await waitFor(() => expect(toPng).toHaveBeenCalledTimes(2));
    });

    it('미리보기도 자르지 않는다', () => {
      render(h(ShareEntrySheet, { ...props, quote, note }));
      expect(screen.getByRole('region', { name: '카드 미리보기' }).innerHTML).not.toContain(
        'line-clamp'
      );
    });
  });

  it('공유 창이 없으면 그림을 내려받고 링크는 열지 않는다', async () => {
    render(h(ShareEntrySheet, props));
    const button = await screen.findByRole('button', { name: '이미지 저장' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(rpc).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });
});
