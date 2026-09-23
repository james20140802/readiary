// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReflectionConfirmationRequiredError } from '@/lib/actions/updateEntry';
import EntryFormBody from '@/components/entries/EntryFormBody';
import { apiFetch } from '@/lib/api/fetch';
vi.mock('@/lib/api/fetch', async (original) => ({
  ...(await original<object>()),
  apiFetch: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
const show = () => {
  const submit = vi.fn().mockResolvedValue(null);
  render(
    React.createElement(EntryFormBody, {
      entryId: 'entry',
      initial: { quote: '원문', isPrivate: true, date: '2026-09-23' },
      submitLabel: '고쳐 남기기',
      onSubmit: submit,
    })
  );
  fireEvent.click(screen.getByRole('button', { name: '비공개' }));
  return submit;
};
it('does not show or require thought acknowledgement for zero public thoughts without rollout', async () => {
  vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ total: 0 })));
  const submit = show();
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '고쳐 남기기' }) as HTMLButtonElement).disabled
    ).toBe(false)
  );
  expect(screen.queryByRole('checkbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '고쳐 남기기' }));
  await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  expect(vi.mocked(apiFetch).mock.calls[0][0]).toContain('publicOnly=1');
});
it('keeps acknowledgement for existing public thoughts even after rollout is disabled', async () => {
  vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ total: 2 })));
  const submit = show();
  const check = await screen.findByRole('checkbox');
  expect((screen.getByRole('button', { name: '고쳐 남기기' }) as HTMLButtonElement).disabled).toBe(
    true
  );
  fireEvent.click(check);
  fireEvent.click(screen.getByRole('button', { name: '고쳐 남기기' }));
  await waitFor(() => expect(submit).toHaveBeenCalledOnce());
});
it('blocks failed checks and retries instead of claiming there are no affected thoughts', async () => {
  vi.mocked(apiFetch)
    .mockResolvedValueOnce(new Response('{}', { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ total: 0 })));
  show();
  await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: '고쳐 남기기' }) as HTMLButtonElement).disabled).toBe(
    true
  );
  fireEvent.click(screen.getByRole('button', { name: '다시 확인' }));
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: '고쳐 남기기' }) as HTMLButtonElement).disabled
    ).toBe(false)
  );
});

it('opens a fresh acknowledgement after the server rejects a stale formerly-public form', async () => {
  vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ total: 1 })));
  const submit = vi
    .fn()
    .mockRejectedValueOnce(new ReflectionConfirmationRequiredError('다시 확인'))
    .mockResolvedValue(null);
  render(
    React.createElement(EntryFormBody, {
      entryId: 'entry',
      initial: { quote: '원문', isPrivate: false, date: '2026-09-23' },
      submitLabel: '고쳐 남기기',
      onSubmit: submit,
    })
  );
  fireEvent.click(screen.getByRole('button', { name: '고쳐 남기기' }));
  const check = await screen.findByRole('checkbox');
  expect((screen.getByRole('button', { name: '고쳐 남기기' }) as HTMLButtonElement).disabled).toBe(
    true
  );
  fireEvent.click(check);
  fireEvent.click(screen.getByRole('button', { name: '고쳐 남기기' }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[0][0].reflection_count).toBeNull();
  expect(submit.mock.calls[1][0].reflection_count).toBe(1);
});
