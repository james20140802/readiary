// @vitest-environment jsdom
import { createElement as h, Suspense } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExcerptPrompt } from '@/lib/monthly-excerpt/types';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));

const { default: MonthPrompt } = await import('../MonthPrompt');

const prompt: ExcerptPrompt = { month: '2026-03', quoteCount: 38, bookCount: 4 };
const show = async (p: Promise<ExcerptPrompt | null>) => {
  await act(async () => {
    render(h(Suspense, { fallback: null }, h(MonthPrompt, { prompt: p })));
  });
};

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('MonthPrompt', () => {
  it('안내 문구와 두 행동을 보인다', async () => {
    await show(Promise.resolve(prompt));
    expect(screen.getByText('3월을 엮어 볼까요?')).toBeTruthy();
    expect(screen.getByText('네 권의 책에서 문장 서른여덟 개를 남겼어요.')).toBeTruthy();
    expect(screen.getByRole('link', { name: '문장 고르기' }).getAttribute('href')).toBe(
      '/excerpts/2026-03/compose'
    );
  });

  it('다음에: 사라지고 그 달에는 다시 뜨지 않는다', async () => {
    await show(Promise.resolve(prompt));
    fireEvent.click(screen.getByRole('button', { name: '다음에' }));
    expect(screen.queryByText('3월을 엮어 볼까요?')).toBeNull();
    cleanup();
    await show(Promise.resolve(prompt));
    expect(screen.queryByText('3월을 엮어 볼까요?')).toBeNull();
  });

  it('안내할 달이 없거나 조회가 실패했으면(null) 아무것도 그리지 않는다', async () => {
    await show(Promise.resolve(null));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByText(/엮어 볼까요/)).toBeNull();
  });
});
