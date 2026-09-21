// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReflectionThread from '@/components/reflections/ReflectionThread';
import ReflectionPreview from '@/components/reflections/ReflectionPreview';
import { apiFetch } from '@/lib/api/fetch';
vi.mock('@/lib/api/fetch', async (original) => ({
  ...(await original<object>()),
  apiFetch: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/hooks/useCreationSubmission', () => ({
  useCreationSubmission: () => ({
    ready: true,
    accountId: 'owner',
    busy: false,
    snapshot: null,
    error: null,
    submit: vi.fn(),
  }),
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  }),
}));
vi.mock('@/lib/reflections/summaryRefresh', () => ({ subscribeReflectionSummary: () => () => {} }));
vi.mock('@/components/entries/EntryReader', () => ({ default: () => null }));
const item = (i: number) => ({
  id: `thought-${i}`,
  entry_id: 'entry',
  body: `생각 ${i}`,
  is_private: true,
  created_at: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
  updated_at: '2026-09-21T00:00:00Z',
});
const page = (
  items = Array.from({ length: 20 }, (_, i) => item(i)),
  nextCursor: string | null = null
) => ({
  items,
  nextCursor,
  summary: { total: 21, latest: item(20) },
  canWrite: true,
  entryIsPrivate: false,
  viewerId: 'owner',
});
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => setTimeout(callback, 0));
});
describe('draft retention through refresh and failed storage', () => {
  it('keeps an unsaved owner draft mounted after a transient focus refresh failure', async () => {
    vi.mocked(apiFetch).mockResolvedValue(response(page([], null)));
    render(React.createElement(ReflectionThread, { entryId: 'entry', openComposer: true }));
    const area = await screen.findByRole('textbox', { name: '지금의 생각' });
    vi.stubGlobal('sessionStorage', {
      length: 0,
      key: () => null,
      getItem: () => null,
      removeItem: vi.fn(),
      clear: vi.fn(),
      setItem: () => {
        throw new Error('quota');
      },
    });
    fireEvent.change(area, { target: { value: '잃지 말아야 할 생각' } });
    await screen.findByText(/초안을 이 기기에 보관하지 못했어요/);
    vi.mocked(apiFetch).mockResolvedValue(response({}, 500));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await screen.findByText('이어 남긴 생각을 불러오지 못했습니다.');
    expect(screen.getByRole('textbox', { name: '지금의 생각' })).toBe(area);
    expect((area as HTMLTextAreaElement).value).toBe('잃지 말아야 할 생각');
  });
  it('keeps the same editor for a thought beyond the first page after background refresh', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(response(page(undefined, 'next')))
      .mockResolvedValueOnce(response(page([item(20)])));
    render(React.createElement(ReflectionThread, { entryId: 'entry' }));
    fireEvent.click(await screen.findByRole('button', { name: '다음 생각 더 읽기' }));
    await screen.findByText('생각 20');
    fireEvent.click(screen.getAllByRole('button', { name: '수정' }).at(-1)!);
    const area = await screen.findByRole('textbox', { name: '생각 고치기' });
    vi.stubGlobal('sessionStorage', {
      length: 0,
      key: () => null,
      getItem: () => null,
      removeItem: vi.fn(),
      clear: vi.fn(),
      setItem: () => {
        throw new Error('quota');
      },
    });
    fireEvent.change(area, { target: { value: '스무 번째 이후의 초안' } });
    vi.mocked(apiFetch).mockResolvedValue(response(page(undefined, 'next')));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(screen.getByRole('textbox', { name: '생각 고치기' })).toBe(area));
    expect((area as HTMLTextAreaElement).value).toBe('스무 번째 이후의 초안');
  });
  it('uses one sibling discard confirmation; continue retains draft and discard closes it', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      response({ ...page([]), summary: { total: 0, latest: null } })
    );
    render(
      React.createElement(ReflectionPreview, {
        entryId: 'entry',
        summary: { total: 0, latest: null },
        own: true,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: '지금의 생각 남기기' }));
    const area = await screen.findByRole('textbox', { name: '지금의 생각' });
    vi.stubGlobal('sessionStorage', {
      length: 0,
      key: () => null,
      getItem: () => null,
      removeItem: vi.fn(),
      clear: vi.fn(),
      setItem: () => {
        throw new Error('quota');
      },
    });
    fireEvent.change(area, { target: { value: '보관되지 않은 초안' } });
    await screen.findByText(/초안을 이 기기에 보관하지 못했어요/);
    fireEvent.click(screen.getByRole('button', { name: '생각 접기' }));
    expect(screen.getAllByRole('group', { name: '초안 보관 실패' })).toHaveLength(1);
    const keep = screen.getByRole('button', { name: '계속 쓰기' });
    expect(keep.parentElement?.closest('button')).toBeNull();
    fireEvent.click(keep);
    await waitFor(() => expect(document.activeElement).toBe(area));
    expect((area as HTMLTextAreaElement).value).toBe('보관되지 않은 초안');
    expect(screen.queryByRole('group', { name: '초안 보관 실패' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '생각 접기' }));
    fireEvent.click(screen.getByRole('button', { name: '버리고 접기' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.getByRole('button', { name: '지금의 생각 남기기' }).getAttribute('aria-expanded')
    ).toBe('false');
  });
  it('clears the timeline and editor on an explicit revoked-access response', async () => {
    vi.mocked(apiFetch).mockResolvedValue(response(page([])));
    render(React.createElement(ReflectionThread, { entryId: 'entry', openComposer: true }));
    await screen.findByRole('textbox', { name: '지금의 생각' });
    vi.mocked(apiFetch).mockResolvedValue(response({}, 404));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await screen.findByText('이 기록을 더 이상 볼 수 없습니다.');
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
