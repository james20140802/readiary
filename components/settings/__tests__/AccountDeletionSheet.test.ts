// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/fetch', () => ({
  apiFetch,
  SessionExpiredError: class SessionExpiredError extends Error {},
}));
const auth = vi.hoisted(() => ({ signOut: vi.fn(), signInWithOAuth: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({ auth }) }));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/pwa/clear-caches', () => ({ clearPwaCaches: vi.fn(async () => {}) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// 내보내기 시트는 따로 검증한다 — 여기서는 열렸는지만 본다
vi.mock('@/components/export/ExportRecordsSheet', () => ({
  default: ({ open, scope }: { open: boolean; scope: { kind: string } }) =>
    open ? h('p', null, `내보내기 시트:${scope.kind}`) : null,
}));

import AccountDeletionSheet from '../AccountDeletionSheet';

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

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const NOW = new Date('2026-11-12T03:00:00Z');
const base = { open: true, onClose: () => {}, now: NOW, maskedEmail: 'read•••@example.com' };

beforeEach(() => {
  apiFetch.mockReset();
  auth.signOut.mockReset().mockResolvedValue({ error: null });
  auth.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
  router.replace.mockReset();
  router.refresh.mockReset();
});
afterEach(cleanup);

describe('AccountDeletionSheet — 비밀번호 계정', () => {
  it('탈퇴할 계정, 신청일 + 14일 날짜와 내보내기 안내를 보여 준다', () => {
    render(h(AccountDeletionSheet, { ...base, hasPassword: true }));
    expect(screen.getByRole('dialog', { name: '탈퇴하기' })).toBeTruthy();
    expect(screen.getByText('read•••@example.com 계정을 탈퇴해요.')).toBeTruthy();
    expect(screen.getByText(/11월 26일까지 다시 로그인하면/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '떠나기 전에 기록 모두 내보내기' }));
    // 떠나는 독자는 달마다 고르지 않고 모든 기록을 한 번에 꺼낸다
    expect(screen.getByText('내보내기 시트:all')).toBeTruthy();
  });

  it('KST 자정을 넘기면 하루 뒤 날짜를 안내한다', () => {
    render(
      h(AccountDeletionSheet, {
        ...base,
        hasPassword: true,
        now: new Date('2026-11-12T15:00:00Z'),
      })
    );
    expect(screen.getByText(/11월 27일까지 다시 로그인하면/)).toBeTruthy();
  });

  it('비밀번호가 비어 있으면 탈퇴 신청을 누를 수 없다', () => {
    render(h(AccountDeletionSheet, { ...base, hasPassword: true }));
    const submit = screen.getByRole('button', { name: '탈퇴 신청' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('비밀번호를 넣고 누르면 신청하고, 틀리면 알려 준다', async () => {
    apiFetch.mockResolvedValue(reply(403, { code: 'wrong_password' }));
    render(h(AccountDeletionSheet, { ...base, hasPassword: true }));
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 신청' }));
    await waitFor(() => expect(screen.getByText('비밀번호가 맞지 않아요.')).toBeTruthy());
    // 화면 낭독기가 오류를 듣도록 입력으로 초점을 옮기고, 입력이 오류 문구를 가리킨다
    const input = screen.getByLabelText('비밀번호');
    expect(document.activeElement).toBe(input);
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const error = screen.getByText('비밀번호가 맞지 않아요.');
    expect(describedBy.split(' ')).toContain(error.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/account/deletion',
      expect.objectContaining({ method: 'POST' })
    );
    const init = apiFetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({ password: 'secret1' });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('성공하면 이 기기에서 로그아웃하고 로그인 화면에 안내를 싣는다', async () => {
    // 2026-11-27 00:00 KST에 지워진다 → 주소에는 되돌릴 수 있는 마지막 날 11-26을 싣는다
    apiFetch.mockResolvedValue(reply(200, { purgeAfter: '2026-11-26T15:00:00.000Z' }));
    render(h(AccountDeletionSheet, { ...base, hasPassword: true }));
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 신청' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        '/login?notice=deletion-requested&until=2026-11-26'
      )
    );
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(auth.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      router.replace.mock.invocationCallOrder[0]
    );
  });

  it('그 밖의 실패는 다시 시도하라고 알린다', async () => {
    apiFetch.mockResolvedValue(reply(503, { code: 'request_failed' }));
    render(h(AccountDeletionSheet, { ...base, hasPassword: true }));
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 신청' }));
    await waitFor(() =>
      expect(screen.getByText('탈퇴를 신청하지 못했어요. 잠시 후 다시 시도해 주세요.')).toBeTruthy()
    );
  });
});

describe('AccountDeletionSheet — 소셜 로그인 계정', () => {
  it('비밀번호 없이 신청할 수 있고, 다시 로그인이 필요하면 설정으로 돌아오는 로그인을 시작한다', async () => {
    apiFetch.mockResolvedValue(reply(403, { code: 'reauth_required' }));
    render(h(AccountDeletionSheet, { ...base, hasPassword: false }));
    expect(screen.queryByLabelText('비밀번호')).toBeNull();
    const submit = screen.getByRole('button', { name: '탈퇴 신청' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    const again = await screen.findByRole('button', { name: '다시 로그인하고 계속' });
    fireEvent.click(again);
    await waitFor(() => expect(auth.signInWithOAuth).toHaveBeenCalledTimes(1));
    const { options } = auth.signInWithOAuth.mock.calls[0][0] as {
      options: { redirectTo: string };
    };
    const next = new URL(options.redirectTo).searchParams.get('next');
    expect(next).toBe('/settings?delete=1');
  });
});
