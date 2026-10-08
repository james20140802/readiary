// @vitest-environment jsdom
import { createElement } from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api/fetch', () => ({ apiFetch: mocks.api }));
import EmailSettings from '../EmailSettings';
import UnsubscribeForm from '@/app/email/unsubscribe/UnsubscribeForm';
const state = {
  accountId: '00000000-0000-4000-8000-000000000001',
  available: true,
  confirmed: true,
  email: 'reader@example.test',
  preferences: { enabled: false, email: null, version: 0, consented_at: null, withdrawn_at: null },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.resetAllMocks();
});
describe('email settings interactions', () => {
  it('starts unchecked, saves by explicit action, and locks duplicate submissions', async () => {
    mocks.api.mockResolvedValueOnce(Response.json(state));
    render(createElement(EmailSettings));
    const box = await screen.findByRole('checkbox');
    expect((box as HTMLInputElement).checked).toBe(false);
    fireEvent.click(box);
    expect(mocks.api).toHaveBeenCalledTimes(1);
    let finish!: (r: Response) => void;
    mocks.api.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        })
    );
    const button = screen.getByRole('button', { name: '이메일 설정 저장' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.api).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mocks.api.mock.calls[1][1].body).expectedEmail).toBe(state.email);
    finish(Response.json({ preferences: { ...state.preferences, enabled: true, version: 1 } }));
    expect(await screen.findByText(/수신 동의가 저장/)).toBeTruthy();
  });
  it('preserves request identity and selected state on uncertain failure', async () => {
    mocks.api
      .mockResolvedValueOnce(Response.json(state))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(
        Response.json({ preferences: { ...state.preferences, enabled: true, version: 1 } })
      );
    render(createElement(EmailSettings));
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '이메일 설정 저장' }));
    await screen.findByRole('alert');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '이메일 설정 저장' }));
    await screen.findByText(/수신 동의가 저장/);
    expect(mocks.api.mock.calls[1][1].body).toBe(mocks.api.mock.calls[2][1].body);
  });
  it('requires refreshing a conflict, without automatic opt-in retry', async () => {
    mocks.api
      .mockResolvedValueOnce(Response.json(state))
      .mockResolvedValueOnce(
        Response.json({ error: '다른 화면에서 설정이 바뀌었습니다.' }, { status: 409 })
      )
      .mockResolvedValueOnce(
        Response.json({ ...state, preferences: { ...state.preferences, version: 2 } })
      );
    render(createElement(EmailSettings));
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '이메일 설정 저장' }));
    await screen.findByRole('alert');
    expect(
      (screen.getByRole('button', { name: '이메일 설정 저장' }) as HTMLButtonElement).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '최신 설정 다시 확인' }));
    await waitFor(() =>
      expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    );
    expect(mocks.api).toHaveBeenCalledTimes(3);
  });
  it('retries independent loading failure', async () => {
    mocks.api.mockRejectedValueOnce(new Error()).mockResolvedValueOnce(Response.json(state));
    render(createElement(EmailSettings));
    fireEvent.click(await screen.findByRole('button', { name: '최신 설정 다시 확인' }));
    expect(await screen.findByRole('checkbox')).toBeTruthy();
  });
  it('requires explicit POST after opening a fragment and supports retry', async () => {
    window.history.replaceState(null, '', '/email/unsubscribe#' + 'a'.repeat(43));
    const post = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: '다시 시도해 주세요.' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', post);
    render(createElement(UnsubscribeForm));
    expect(post).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
    fireEvent.click(screen.getByRole('button', { name: '이메일 수신거부' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '이메일 수신거부' }));
    await screen.findByRole('status');
    expect(post.mock.calls[0][1].body).toBe(post.mock.calls[1][1].body);
  });
});
