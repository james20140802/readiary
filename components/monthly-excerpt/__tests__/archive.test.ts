// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import type { ExcerptMonthRow, YearRow } from '@/lib/monthly-excerpt/types';

const apiFetch = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));

const { default: Archive } = await import('../MonthlyExcerptArchive');

const years: YearRow[] = [
  { year: 2026, excerptCount: 2, hasUnmade: true },
  { year: 2025, excerptCount: 9, hasUnmade: false },
];
const row = (month: string, over: Partial<ExcerptMonthRow> = {}): ExcerptMonthRow => ({
  month,
  quoteCount: 5,
  excerptId: `x-${month}`,
  isShared: false,
  coverQuote: `표지 ${month}`,
  ...over,
});
const months2026 = [
  row('2026-03', { excerptId: null, coverQuote: null }),
  row('2026-02'),
  row('2026-01'),
];

const show = (over: Partial<Parameters<typeof Archive>[0]> = {}) =>
  render(
    h(
      TopBarProvider,
      null,
      h(Archive, {
        years,
        firstYearMonths: months2026,
        viewer: 'owner',
        hrefFor: (m: string) => `/excerpts/${m}`,
        ...over,
      })
    )
  );
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('MonthlyExcerptArchive', () => {
  it('첫 해는 펼쳐 달을 보이고, 지난 해는 접혀 있다', () => {
    show();
    const open = screen.getByRole('button', { name: /2026년/ });
    const closed = screen.getByRole('button', { name: /2025년/ });
    expect(open.getAttribute('aria-expanded')).toBe('true');
    expect(closed.getAttribute('aria-expanded')).toBe('false');
    expect(closed.textContent).toContain('9권 · 펼치기');
    expect(screen.getByText('표지 2026-02')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('내 화면: 안 엮은 달은 흐리게 안내하고 엮기로, 엮은 달은 펼치기로 간다', () => {
    show();
    expect(screen.getByText('아직 엮지 않았어요')).toBeTruthy();
    expect(screen.getByRole('link', { name: '2026년 3월 엮기' }).getAttribute('href')).toBe(
      '/excerpts/2026-03/compose'
    );
    expect(screen.getByRole('link', { name: '2026년 2월 펼치기' }).getAttribute('href')).toBe(
      '/excerpts/2026-02'
    );
  });

  it('친구 화면: 엮지 않은 달과 엮기가 없다', () => {
    show({ viewer: 'friend' });
    expect(screen.queryByText('아직 엮지 않았어요')).toBeNull();
    expect(screen.queryByRole('link', { name: /엮기/ })).toBeNull();
    expect(screen.getByRole('link', { name: '2026년 1월 펼치기' })).toBeTruthy();
  });

  it('접힌 해는 펼칠 때만 그 해를 가져오고, 다시 접었다 펴도 다시 가져오지 않는다', async () => {
    apiFetch.mockResolvedValue(json({ months: [row('2025-12')] }));
    show();
    const button = screen.getByRole('button', { name: /2025년/ });
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await screen.findByText('표지 2025-12');
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/api/monthly-excerpts?year=2025');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(screen.getByText('표지 2025-12')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('가져오기 실패: 그 해에만 오류와 다시 시도가 나오고 다른 해는 그대로다', async () => {
    apiFetch.mockResolvedValueOnce(json({ error: 'x' }, 500));
    show();
    fireEvent.click(screen.getByRole('button', { name: /2025년/ }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('불러오지 못했어요');
    expect(screen.getByText('표지 2026-02')).toBeTruthy();

    apiFetch.mockResolvedValueOnce(json({ months: [row('2025-12')] }));
    fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }));
    await screen.findByText('표지 2025-12');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('첫 해를 서버에서 받지 못했으면 그 해 안에서 다시 시도한다', async () => {
    apiFetch.mockResolvedValueOnce(json({ months: months2026 }));
    show({ firstYearMonths: null });
    fireEvent.click(await screen.findByRole('button', { name: '다시 시도' }));
    await screen.findByText('표지 2026-02');
    expect(apiFetch).toHaveBeenCalledWith('/api/monthly-excerpts?year=2026');
  });

  it('해가 없으면 빈 안내와 오늘로 가는 길을 준다', () => {
    show({ years: [], firstYearMonths: [] });
    expect(screen.getByText(/아직 엮을 달이 없어요/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '오늘 남기기' }).getAttribute('href')).toBe('/today');
  });

  it('친구 화면의 빈 안내에는 엮기 안내와 오늘 링크가 없다', () => {
    show({ years: [], firstYearMonths: [], viewer: 'friend' });
    expect(screen.getByText('아직 친구에게 보여 준 달이 없어요.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '오늘 남기기' })).toBeNull();
  });

  it('표지 문장이 없는 엮은 달은 문장 수로 보인다', () => {
    show({ firstYearMonths: [row('2026-02', { coverQuote: null, quoteCount: 4 })] });
    expect(screen.getByText('문장 4개')).toBeTruthy();
  });

  it('해 단추는 진짜 button이라 키보드 초점을 받고, aria-controls를 두지 않는다', () => {
    show();
    const button = screen.getByRole('button', { name: /2026년/ });
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.tagName).toBe('BUTTON');
    // 접힌 동안 없는 요소를 가리키지 않는다
    expect(button.hasAttribute('aria-controls')).toBe(false);
  });
});
