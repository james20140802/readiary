// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import type { MonthlyExcerpt } from '@/lib/monthly-excerpt/types';
import { item, stubBrowser } from './fixtures';

stubBrowser(vi.stubGlobal);

const replace = vi.fn();
const refresh = vi.fn();
const apiFetch = vi.fn();
const toastError = vi.fn();
const flags = vi.hoisted(() => ({ MONTHLY_EXCERPT_SHARING: false }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (m: string) => toastError(m) } }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));
vi.mock('@/lib/monthly-excerpt/flags', () => flags);

const { default: OwnerView } = await import('../MonthlyExcerptOwnerView');

const excerpt = (over: Partial<MonthlyExcerpt> = {}): MonthlyExcerpt => ({
  id: 'x1',
  month: '2026-03',
  isShared: false,
  firstSharedAt: null,
  items: [item(1), item(2, { note: '생각' }), item(3, { isPrivate: true })],
  ...over,
});
const show = (e = excerpt()) => render(h(TopBarProvider, null, h(OwnerView, { excerpt: e })));

beforeEach(() => {
  vi.clearAllMocks();
  flags.MONTHLY_EXCERPT_SHARING = false;
});
afterEach(cleanup);

describe('MonthlyExcerptOwnerView', () => {
  it('고치기는 엮기로 간다', () => {
    show();
    expect(screen.getByRole('link', { name: '고치기' }).getAttribute('href')).toBe(
      '/excerpts/2026-03/compose'
    );
  });

  it('스위치가 꺼져 있으면 공개 전환이 없다', () => {
    show();
    expect(screen.queryByRole('button', { name: '친구에게 보여 주기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '나만 보기' })).toBeNull();
  });

  it('지우기: 확인 문구 뒤 DELETE, 성공하면 모아 보기로', async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 204 }));
    show();
    fireEvent.click(screen.getByRole('button', { name: '지우기' }));
    expect(screen.getByText('달의 발췌집만 지워져요. 남긴 기록은 그대로예요.')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button.flex-1:last-child') as HTMLElement);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/excerpts'));
    expect(apiFetch).toHaveBeenCalledWith('/api/monthly-excerpts/x1', { method: 'DELETE' });
  });

  it('지우기 실패: 머물고 서버 문구를 알린다', async () => {
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: '찾을 수 없는 발췌집이에요.' }), { status: 404 })
    );
    show();
    fireEvent.click(screen.getByRole('button', { name: '지우기' }));
    fireEvent.click(
      screen.getByRole('dialog').querySelector('button.flex-1:last-child') as HTMLElement
    );
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('찾을 수 없는 발췌집이에요.'));
    expect(replace).not.toHaveBeenCalled();
  });

  it('스위치를 켜면 공개 전 안내를 보이고 PATCH한다', async () => {
    flags.MONTHLY_EXCERPT_SHARING = true;
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    show();
    fireEvent.click(screen.getByRole('button', { name: '친구에게 보여 주기' }));
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByText('생각 1개도 함께 보여요')).toBeTruthy();
    expect(screen.getByText('문장 1개는 친구에게 보이지 않아요')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('dialog').querySelector('button.flex-1:last-child') as HTMLElement
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = apiFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/monthly-excerpts/x1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ isShared: true });
  });

  it('공개 중이면 나만 보기는 안내 없이 바로 바꾼다', async () => {
    flags.MONTHLY_EXCERPT_SHARING = true;
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    show(excerpt({ isShared: true }));
    fireEvent.click(screen.getByRole('button', { name: '나만 보기' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(JSON.parse((apiFetch.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      isShared: false,
    });
  });

  it('보일 문장이 없으면 공개 버튼이 막힌다', () => {
    flags.MONTHLY_EXCERPT_SHARING = true;
    show(excerpt({ items: [item(1, { isPrivate: true })] }));
    fireEvent.click(screen.getByRole('button', { name: '친구에게 보여 주기' }));
    expect(screen.getByText('친구에게 보일 문장이 없어요.')).toBeTruthy();
    const confirm = screen
      .getByRole('dialog')
      .querySelector('button.flex-1:last-child') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});
