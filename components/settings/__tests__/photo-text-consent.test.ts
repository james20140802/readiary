// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api/fetch';
import PhotoTextConsent from '../PhotoTextConsent';

vi.mock('@/lib/api/fetch', () => ({
  apiFetch: vi.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
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

function serve(replies: Record<string, { status?: number; body: unknown }[]>) {
  const calls: string[] = [];
  vi.mocked(apiFetch).mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    calls.push(key);
    const queue = replies[key];
    if (!queue?.length) throw new Error(`unexpected ${key}`);
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    return Response.json(reply.body, { status: reply.status ?? 200 });
  });
  return calls;
}

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', 'true'));
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const open = () => fireEvent.click(screen.getByRole('button', { name: /사진 글자 읽기 동의/ }));

describe('PhotoTextConsent', () => {
  it('기능이 꺼져 있고 동의하지 않았으면 행을 그리지 않는다', async () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', '');
    const calls = serve({ 'GET /api/photo-text/consent': [{ body: { consented: false } }] });
    const { container } = render(h(PhotoTextConsent));
    expect(container.innerHTML).toBe('');
    await waitFor(() => expect(calls).toEqual(['GET /api/photo-text/consent']));
    expect(container.innerHTML).toBe('');
  });

  it('기능이 꺼져 있어도 동의한 사람에게는 철회 행을 보이고, 철회하면 행이 사라진다', async () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', '');
    const calls = serve({
      'GET /api/photo-text/consent': [{ body: { consented: true } }],
      'DELETE /api/photo-text/consent': [{ body: { consented: false } }],
    });
    const { container } = render(h(PhotoTextConsent));
    fireEvent.click(await screen.findByRole('button', { name: /사진 글자 읽기 동의/ }));
    expect(await screen.findByText(/Google\(미국\)로 보내 글자를 읽는 데 동의했어요/)).toBeTruthy();
    expect(screen.queryByText(/사진으로 옮기기를 누를 때/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '동의 철회' }));
    await waitFor(() => expect(container.innerHTML).toBe(''));
    expect(screen.queryByRole('button', { name: /사진 글자 읽기 동의/ })).toBeNull();
    expect(calls).toEqual(['GET /api/photo-text/consent', 'DELETE /api/photo-text/consent']);
  });

  it('기능이 꺼져 있을 때 동의 여부를 불러오지 못하면 행을 그리지 않는다', async () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', '');
    const calls = serve({ 'GET /api/photo-text/consent': [{ status: 503, body: { error: 'x' } }] });
    const { container } = render(h(PhotoTextConsent));
    await waitFor(() => expect(calls).toEqual(['GET /api/photo-text/consent']));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.innerHTML).toBe('');
  });

  it('행을 누르기 전에는 서버에 묻지 않고, 누르면 한 번 묻는다', async () => {
    const calls = serve({ 'GET /api/photo-text/consent': [{ body: { consented: false } }] });
    render(h(PhotoTextConsent));
    expect(calls).toEqual([]);
    open();
    expect(await screen.findByText(/아직 동의하지 않았어요/)).toBeTruthy();
    expect(calls).toEqual(['GET /api/photo-text/consent']);
    expect(screen.queryByRole('button', { name: '동의 철회' })).toBeNull();
  });

  it('동의한 사람은 철회할 수 있고, 철회하면 동의하지 않은 상태로 보인다', async () => {
    const calls = serve({
      'GET /api/photo-text/consent': [{ body: { consented: true } }],
      'DELETE /api/photo-text/consent': [{ body: { consented: false } }],
    });
    render(h(PhotoTextConsent));
    open();
    expect(await screen.findByText(/Google\(미국\)로 보내 글자를 읽는 데 동의했어요/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '동의 철회' }));
    expect(await screen.findByText(/아직 동의하지 않았어요/)).toBeTruthy();
    expect(calls).toContain('DELETE /api/photo-text/consent');
  });

  it('철회에 실패하면 동의한 상태 그대로 두고 알린다', async () => {
    serve({
      'GET /api/photo-text/consent': [{ body: { consented: true } }],
      'DELETE /api/photo-text/consent': [{ status: 503, body: { error: 'x' } }],
    });
    render(h(PhotoTextConsent));
    open();
    fireEvent.click(await screen.findByRole('button', { name: '동의 철회' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: '동의 철회' })).toBeTruthy();
  });

  it('불러오지 못하면 다시 시도할 수 있다', async () => {
    const calls = serve({
      'GET /api/photo-text/consent': [
        { status: 503, body: { error: 'x' } },
        { body: { consented: true } },
      ],
    });
    render(h(PhotoTextConsent));
    open();
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('button', { name: '동의 철회' })).toBeTruthy();
    await waitFor(() => expect(calls).toHaveLength(2));
  });
});
