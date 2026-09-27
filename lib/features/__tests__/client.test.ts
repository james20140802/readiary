// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ReflectionFeatureProvider, {
  ReflectionFeatureContext,
} from '@/components/features/ReflectionFeatureProvider';
import ReflectionPreview from '@/components/reflections/ReflectionPreview';
const mocks = vi.hoisted(() => ({
  subscribe: vi.fn(),
  auth: vi.fn(),
  callback: null as null | ((event: string, session: { user: { id: string } } | null) => void),
}));
vi.mock('@/lib/reflections/summaryRefresh', () => ({
  subscribeReflectionSummary: mocks.subscribe,
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({ auth: { onAuthStateChange: mocks.auth } }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.subscribe.mockReturnValue(() => {});
  mocks.auth.mockImplementation((callback) => {
    mocks.callback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const preview = React.createElement(ReflectionPreview, {
  entryId: 'entry',
  own: true,
  summary: { total: 0, latest: null },
});
it('hides thought actions and avoids subscriptions without an enabled provider', () => {
  render(preview);
  expect(screen.queryByRole('link')).toBeNull();
  expect(mocks.subscribe).not.toHaveBeenCalled();
});
it('mounts and unmounts feature actions when the flag changes', () => {
  const view = render(
    React.createElement(ReflectionFeatureContext.Provider, { value: true }, preview)
  );
  expect(screen.getByRole('link', { name: '지금의 생각 남기기' })).toBeTruthy();
  view.rerender(React.createElement(ReflectionFeatureContext.Provider, { value: false }, preview));
  expect(screen.queryByRole('link')).toBeNull();
});
it('clears enabled state immediately on account change and ignores stale responses', async () => {
  let finish: ((response: Response) => void) | undefined;
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        })
    )
    .mockResolvedValue(new Response(JSON.stringify({ enabled: false, userId: 'other' })));
  vi.stubGlobal('fetch', fetch);
  render(
    React.createElement(
      ReflectionFeatureProvider,
      {
        initial: { enabled: true, userId: 'owner' },
      },
      preview
    )
  );
  fireEvent(window, new Event('focus'));
  act(() => mocks.callback?.('SIGNED_IN', { user: { id: 'other' } }));
  expect(screen.queryByRole('link')).toBeNull();
  await act(async () => finish?.(new Response(JSON.stringify({ enabled: true, userId: 'owner' }))));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('link')).toBeNull();
});
it('turns off on a failed focus refresh', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(
    React.createElement(
      ReflectionFeatureProvider,
      {
        initial: { enabled: true, userId: 'owner' },
      },
      preview
    )
  );
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
});

it('does not advertise thoughts while their count is unknown or zero', () => {
  const previewFor = (summary: { total: number; latest: null } | null) =>
    React.createElement(
      ReflectionFeatureContext.Provider,
      { value: true },
      React.createElement(ReflectionPreview, { entryId: 'entry', own: true, summary })
    );
  const view = render(previewFor(null));
  expect(screen.queryByRole('link', { name: /이어 남긴 생각/ })).toBeNull();
  expect(screen.getByRole('link', { name: '지금의 생각 남기기' })).toBeTruthy();
  view.rerender(previewFor({ total: 2, latest: null }));
  expect(screen.getByRole('link', { name: '이어 남긴 생각 2개 보기' })).toBeTruthy();
  view.rerender(previewFor({ total: 0, latest: null }));
  expect(screen.queryByRole('link', { name: /이어 남긴 생각/ })).toBeNull();
});
