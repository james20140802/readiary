// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubBrowser } from '@/components/monthly-excerpt/__tests__/fixtures';
import type { OwnSentenceRow } from '@/lib/monthly-sentence/types';
import { candidate, ownRow, res } from './fixtures';

stubBrowser(vi.stubGlobal);

const apiFetch = vi.fn();
const toastError = vi.fn();

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));

const { default: SentencePickerSheet } = await import('../SentencePickerSheet');

const onClose = vi.fn();
const onPicked = vi.fn();
const page = (over: Record<string, unknown> = {}) => ({
  pickedEntryId: null,
  publicCount: 2,
  total: 2,
  hasMore: false,
  items: [candidate(9), candidate(2)],
  ...over,
});
const show = (current: OwnSentenceRow = ownRow('2026-11'), open = true) =>
  render(h(SentencePickerSheet, { open, onClose, month: '2026-11', current, onPicked }));
const calls = () => apiFetch.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('SentencePickerSheet', () => {
  it('닫혀 있으면 후보를 부르지 않는다', () => {
    show(ownRow('2026-11'), false);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('열면 그 달의 후보를 한 번 부르고, 지금 문장을 맨 위에 보인다', async () => {
    apiFetch.mockResolvedValue(res(page()));
    show(ownRow('2026-11', { quote: '지금의 문장' }));
    expect(screen.getByRole('dialog', { name: '11월의 문장' })).toBeTruthy();
    await screen.findByRole('radio', { name: /후보 9/ });
    expect(calls()).toEqual(['GET /api/monthly-sentences/candidates?month=2026-11&offset=0']);
    const now = screen.getByText('지금 문장');
    expect(now.parentElement?.textContent).toContain('지금의 문장');
    expect(
      now.compareDocumentPosition(screen.getByRole('radiogroup')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('지금 문장인 후보가 선택돼 있다', async () => {
    apiFetch.mockResolvedValue(res(page()));
    show(ownRow('2026-11', { entryId: 'c2' }));
    expect(
      (await screen.findByRole('radio', { name: /후보 2/ })).getAttribute('aria-checked')
    ).toBe('true');
    expect(screen.getByRole('radio', { name: /후보 9/ }).getAttribute('aria-checked')).toBe(
      'false'
    );
  });

  it('후보에 책 제목과 날짜가 보인다', async () => {
    apiFetch.mockResolvedValue(res(page()));
    show();
    const radio = await screen.findByRole('radio', { name: /후보 9/ });
    expect(radio.textContent).toContain('책');
    expect(radio.textContent).toContain('11월 9일');
  });

  it.each([
    [2, '나만 보여요 · 친구에게는 다른 문장이 보여요'],
    [0, '나만 보여요 · 친구에게는 이 달이 보이지 않아요'],
  ])('나만 보기 후보에 공개 문장 %i개일 때의 안내를 붙인다', async (publicCount, notice) => {
    apiFetch.mockResolvedValue(
      res(page({ publicCount, items: [candidate(9, { isPrivate: true }), candidate(2)] }))
    );
    show();
    const radio = await screen.findByRole('radio', { name: /후보 9/ });
    expect(radio.textContent).toContain('나만 보기');
    expect(radio.textContent).toContain(notice);
    expect(screen.getByRole('radio', { name: /후보 2/ }).textContent).not.toContain('나만 보');
  });

  it('고르면 저장하고 바뀐 줄을 알린 뒤 닫는다', async () => {
    const row = ownRow('2026-11', { entryId: 'c9', source: 'picked' });
    apiFetch.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? res({ row }) : res(page())
    );
    show();
    fireEvent.click(await screen.findByRole('radio', { name: /후보 9/ }));
    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(row));
    expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({ month: '2026-11', entryId: 'c9' });
    expect(onClose).toHaveBeenCalled();
  });

  it('저장하는 동안 다시 고르지 못한다', async () => {
    apiFetch.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? new Promise<Response>(() => {}) : Promise.resolve(res(page()))
    );
    show();
    fireEvent.click(await screen.findByRole('radio', { name: /후보 9/ }));
    fireEvent.click(screen.getByRole('radio', { name: /후보 2/ }));
    await waitFor(() => expect(calls().filter((c) => c.startsWith('PUT'))).toHaveLength(1));
  });

  it('저장하지 못하면 닫지 않고 알린다', async () => {
    apiFetch.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? res({ error: 'x' }, false) : res(page())
    );
    show();
    fireEvent.click(await screen.findByRole('radio', { name: /후보 9/ }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.')
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(onPicked).not.toHaveBeenCalled();
  });

  it('자동으로 되돌리기는 내가 고른 달에만 있고 선택을 푼다', async () => {
    const row = ownRow('2026-11', { source: 'auto' });
    apiFetch.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? res({ row }) : res(page())
    );
    const first = show(ownRow('2026-11', { source: 'auto' }));
    await screen.findByRole('radio', { name: /후보 9/ });
    expect(screen.queryByRole('button', { name: '자동으로 되돌리기' })).toBeNull();
    first.unmount();

    show(ownRow('2026-11', { source: 'picked' }));
    fireEvent.click(await screen.findByRole('button', { name: '자동으로 되돌리기' }));
    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(row));
    expect(JSON.parse(apiFetch.mock.calls.at(-1)?.[1].body)).toEqual({
      month: '2026-11',
      entryId: null,
    });
  });

  it('후보가 더 있으면 더 보기로 이어 받는다', async () => {
    apiFetch.mockResolvedValueOnce(res(page({ total: 3, hasMore: true })));
    show();
    await screen.findByRole('radio', { name: /후보 9/ });
    apiFetch.mockResolvedValueOnce(res(page({ total: 3, hasMore: false, items: [candidate(1)] })));
    fireEvent.click(screen.getByRole('button', { name: '더 보기' }));
    await screen.findByRole('radio', { name: /후보 1(?!\d)/ });
    expect(calls().at(-1)).toBe('GET /api/monthly-sentences/candidates?month=2026-11&offset=2');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
  });

  it('후보를 불러오지 못하면 다시 시도할 수 있다', async () => {
    apiFetch.mockResolvedValueOnce(res({ error: 'x' }, false));
    show();
    await screen.findByText('문장을 불러오지 못했어요.');
    apiFetch.mockResolvedValueOnce(res(page()));
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByRole('radio', { name: /후보 9/ });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('화살표 키로 후보 사이를 옮긴다', async () => {
    apiFetch.mockResolvedValue(res(page()));
    show();
    const first = await screen.findByRole('radio', { name: /후보 9/ });
    const second = screen.getByRole('radio', { name: /후보 2/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(first);
  });
});
