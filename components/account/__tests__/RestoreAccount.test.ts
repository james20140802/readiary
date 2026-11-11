// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/fetch', () => ({
  apiFetch,
  SessionExpiredError: class SessionExpiredError extends Error {},
}));
const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createSupabaseClient: () => ({ auth }) }));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/pwa/clear-caches', () => ({ clearPwaCaches: vi.fn(async () => {}) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import RestoreAccount from '../RestoreAccount';

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const PURGE = '2026-11-26T03:00:00.000Z';

beforeEach(() => {
  apiFetch.mockReset();
  auth.signOut.mockReset().mockResolvedValue({ error: null });
  router.replace.mockReset();
  router.refresh.mockReset();
  toast.success.mockReset();
});
afterEach(cleanup);

describe('RestoreAccount', () => {
  it('삭제 예정일과 되돌리기·로그아웃을 보여 준다', () => {
    render(h(RestoreAccount, { purgeAfter: PURGE, expired: false }));
    expect(screen.getByRole('heading', { name: '탈퇴를 신청한 계정이에요' })).toBeTruthy();
    expect(screen.getByText(/11월 26일에 모든 기록이 지워져요/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '탈퇴 취소하고 돌아가기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
  });

  it('탈퇴를 취소하면 DELETE를 부르고 오늘로 돌아간다', async () => {
    apiFetch.mockResolvedValue(reply(200, { restored: true }));
    render(h(RestoreAccount, { purgeAfter: PURGE, expired: false }));
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 취소하고 돌아가기' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/today'));
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/account/deletion',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(toast.success).toHaveBeenCalledWith('돌아오신 걸 환영해요. 기기 알림은 다시 켜야 해요.');
  });

  it('실패하면 오류를 보여 주고 버튼을 다시 누를 수 있다', async () => {
    apiFetch.mockResolvedValue(reply(503, { code: 'restore_failed' }));
    render(h(RestoreAccount, { purgeAfter: PURGE, expired: false }));
    const button = screen.getByRole('button', { name: '탈퇴 취소하고 돌아가기' });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('되돌리지 못했어요');
    expect(
      (screen.getByRole('button', { name: '탈퇴 취소하고 돌아가기' }) as HTMLButtonElement).disabled
    ).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('복구 기간이 지났으면 지우는 중이라고 알리고 로그아웃만 둔다', () => {
    render(h(RestoreAccount, { purgeAfter: PURGE, expired: true }));
    expect(screen.getByRole('heading', { name: '계정을 지우고 있어요' })).toBeTruthy();
    expect(screen.getByText('복구 기간이 지나 곧 모든 기록이 지워져요.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '탈퇴 취소하고 돌아가기' })).toBeNull();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
  });

  it('되돌릴 수 없다고 답하면(restored: false) 오늘로 가지 않고 지우는 중 화면으로 바꾼다', async () => {
    apiFetch.mockResolvedValue(reply(200, { restored: false }));
    render(h(RestoreAccount, { purgeAfter: PURGE, expired: false }));
    fireEvent.click(screen.getByRole('button', { name: '탈퇴 취소하고 돌아가기' }));
    await screen.findByRole('heading', { name: '계정을 지우고 있어요' });
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '탈퇴 취소하고 돌아가기' })).toBeNull();
  });

  it('로그아웃하면 이 기기에서만 로그아웃하고 로그인 화면으로 간다', async () => {
    render(h(RestoreAccount, { purgeAfter: PURGE, expired: false }));
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
