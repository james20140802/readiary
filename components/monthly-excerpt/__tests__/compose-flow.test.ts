// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import type { ComposePick } from '@/lib/monthly-excerpt/compose';
import { stubBrowser } from './fixtures';

stubBrowser(vi.stubGlobal);

const apiFetch = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));
vi.mock('@/lib/monthly-excerpt/flags', () => ({ MONTHLY_EXCERPT_SHARING: true }));

const { default: ComposeFlow } = await import('../ComposeFlow');

const pick = (entryId: string, isPrivate = false): ComposePick => ({
  entryId,
  quote: `문장 ${entryId}`,
  date: '2026-03-14',
  bookTitle: '책',
  isPrivate,
  hasNote: false,
  note: null,
  fromPage: null,
  toPage: null,
  bookId: 'b1',
  author: null,
});

/** 고치기로 들어와 미리보기까지 간다 */
function toPreview(initialPicks: ComposePick[], initialIsShared?: boolean) {
  render(
    h(
      TopBarProvider,
      null,
      h(ComposeFlow, {
        month: '2026-03',
        books: [],
        firstPage: { items: [], hasMore: false },
        initialPicks,
        initialIsShared,
      })
    )
  );
  fireEvent.click(screen.getByRole('button', { name: '순서 정하기' }));
  fireEvent.click(screen.getByRole('button', { name: '미리보기' }));
}
// 힌트가 라벨 안에 있어 접근 이름 뒤에 붙을 수 있다
const radio = (name: string) =>
  screen.getByRole('radio', { name: new RegExp(`^${name}`) }) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: '엮기' }) as HTMLButtonElement;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('ComposeFlow 공개 범위의 시작 값', () => {
  it('공개 중인 권을 고치면 다시 묻지 않고 친구 공개로 시작해 그대로 저장한다', async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ id: 'x' })));
    toPreview([pick('a')], true);
    expect(radio('친구에게 보여 주기').checked).toBe(true);
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse((apiFetch.mock.calls[0][1] as RequestInit).body as string).isShared).toBe(
      true
    );
  });

  it('나만 보기인 권을 고치면 나만 보기로 시작한다', () => {
    toPreview([pick('a')], false);
    expect(radio('나만 보기').checked).toBe(true);
    expect(saveButton().disabled).toBe(false);
  });

  it('처음 엮을 때는 기본값이 없어 고를 때까지 저장할 수 없다', () => {
    toPreview([pick('a')]);
    expect(radio('친구에게 보여 주기').checked).toBe(false);
    expect(radio('나만 보기').checked).toBe(false);
    expect(saveButton().disabled).toBe(true);
  });

  it('공개 중이었어도 공개 문장이 없으면 다시 고르게 한다', () => {
    toPreview([pick('a', true)], true);
    expect(radio('친구에게 보여 주기').checked).toBe(false);
    expect(saveButton().disabled).toBe(true);
  });
});
