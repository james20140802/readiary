// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/fetch', () => ({
  apiFetch,
  SessionExpiredError: class SessionExpiredError extends Error {},
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ExportRecordsSheet from '../ExportRecordsSheet';

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

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => apiFetch.mockReset());
afterEach(cleanup);

describe('ExportRecordsSheet — 모든 기록', () => {
  it('달을 고르지 않고 모든 기록을 한 번에 가져와 같은 동작으로 꺼낸다', async () => {
    apiFetch.mockResolvedValue(
      json({ markdown: '# 모든 기록\n\n## 책\n', fileName: 'readiary-모든 기록.md', entryCount: 2 })
    );
    render(h(ExportRecordsSheet, { open: true, onClose: () => {}, scope: { kind: 'all' } }));
    expect(
      screen.getByText(
        '지금까지 남긴 모든 문장과 생각을 붙여 넣을 수 있는 글로 꺼내요. 비공개 기록도 포함돼요.'
      )
    ).toBeTruthy();
    expect(await screen.findByLabelText('꺼낼 글 미리보기')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/api/export?scope=all', { cache: 'no-store' });
    expect(screen.getByRole('button', { name: '복사하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '파일로 저장' })).toBeTruthy();
  });

  it('남긴 기록이 없으면 그렇게 알린다', async () => {
    apiFetch.mockResolvedValue(
      json({ markdown: '# 모든 기록\n', fileName: 'readiary-모든 기록.md', entryCount: 0 })
    );
    render(h(ExportRecordsSheet, { open: true, onClose: () => {}, scope: { kind: 'all' } }));
    expect(await screen.findByText('아직 꺼낼 기록이 없어요.')).toBeTruthy();
  });
});
