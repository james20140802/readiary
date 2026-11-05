// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComposePick } from '@/lib/monthly-excerpt/compose';
import PickStep from '../PickStep';
import type { useCandidates, useMonthBooks } from '../useComposeData';
import { stubBrowser } from './fixtures';

stubBrowser(vi.stubGlobal);
afterEach(cleanup);

const pick = (n: number) =>
  ({
    entryId: `e${n}`,
    quote: `문장 ${n}`,
    bookTitle: '책',
    date: '2026-03-01',
    hasNote: false,
    isPrivate: false,
  }) as ComposePick;

const list = {
  status: 'ready',
  items: [],
  userBookId: null,
  hasMore: false,
  moreStatus: 'idle',
} as unknown as ReturnType<typeof useCandidates>;
const chips = { books: [], status: 'ready' } as unknown as ReturnType<typeof useMonthBooks>;

function view(picks: ComposePick[], pickedView: boolean, onToggle = vi.fn()) {
  return h(PickStep, { list, chips, picks, onToggle, pickedView });
}
const box = (n: number) => screen.getByRole('checkbox', { name: `문장 ${n}` });

describe('PickStep 고른 문장 보기 — 해제 후 초점', () => {
  it('다음 줄로 옮긴다', () => {
    const { rerender } = render(view([pick(1), pick(2), pick(3)], true));
    box(2).focus();
    fireEvent.click(box(2));
    rerender(view([pick(1), pick(3)], true));
    expect(document.activeElement).toBe(box(3));
  });

  it('마지막 줄을 해제하면 새 마지막 줄로 옮긴다', () => {
    const { rerender } = render(view([pick(1), pick(2)], true));
    fireEvent.click(box(2));
    rerender(view([pick(1)], true));
    expect(document.activeElement).toBe(box(1));
  });

  it('모두 해제해 전체 보기로 돌아가면 목록으로 옮긴다', () => {
    const { rerender } = render(view([pick(1)], true));
    fireEvent.click(box(1));
    rerender(view([], false));
    expect(document.activeElement).toBe(screen.getByRole('group', { name: '문장 목록' }));
  });
});
