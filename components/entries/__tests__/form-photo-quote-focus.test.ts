// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api/fetch';
import { preparePhoto } from '@/lib/photo-quote/image';
import { forgetPhotoTextConsent } from '@/components/photo-quote/PhotoQuoteButton';
import EntryFormBody from '../EntryFormBody';

// 진짜 버튼과 진짜 대화상자로 확인한다 — 대화상자는 닫히면서 포커스를 열었던 버튼으로 되돌린다
vi.mock('@/components/ui/ActionNavigation', () => ({ default: () => null }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: vi.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}));
vi.mock('@/lib/photo-quote/image', async (original) => ({
  ...(await original<typeof import('@/lib/photo-quote/image')>()),
  preparePhoto: vi.fn(),
}));
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
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

beforeEach(() => {
  forgetPhotoTextConsent();
  vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', 'true');
  URL.revokeObjectURL = vi.fn();
  vi.mocked(preparePhoto).mockResolvedValue({
    blob: new Blob(['x']),
    url: 'blob:photo',
    width: 300,
    height: 400,
  });
  vi.mocked(apiFetch).mockImplementation(async (input) =>
    String(input).endsWith('/consent')
      ? Response.json({ consented: true })
      : Response.json({
          width: 300,
          height: 400,
          words: [
            { text: '새', box: [10, 10, 60, 30], sep: ' ' },
            { text: '문장', box: [70, 10, 120, 30], sep: '' },
          ],
        })
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('사진에서 가져온 뒤 고르는 화면이 닫히면 포커스가 버튼이 아니라 문장 칸에 있다', async () => {
  render(React.createElement(EntryFormBody, { submitLabel: '남기기', onSubmit: vi.fn() }));
  const button = screen.getByRole('button', { name: '사진으로 옮기기' });
  button.focus();
  fireEvent.click(button);
  const pick = await screen.findByRole('button', { name: '앨범에서 고르기' });
  fireEvent.change(pick.parentElement!.querySelector('input[type="file"]:not([capture])')!, {
    target: { files: [new File(['raw'], 'page.jpg', { type: 'image/jpeg' })] },
  });
  // 버튼은 글자를 다 읽기 전에도 꺼진 채로 보인다 — 켜질 때까지 기다린 뒤 누른다
  const useAll = (await screen.findByRole('button', {
    name: '전부 가져오기',
  })) as HTMLButtonElement;
  await waitFor(() => expect(useAll.disabled).toBe(false));
  fireEvent.click(useAll);
  const quote = screen.getByLabelText('문장') as HTMLTextAreaElement;
  await waitFor(() => expect(quote.value).toBe('새 문장'));
  await waitFor(() => expect(screen.queryByRole('application')).toBeNull());
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(document.activeElement).toBe(quote);
  expect(quote.selectionStart).toBe('새 문장'.length);
});
