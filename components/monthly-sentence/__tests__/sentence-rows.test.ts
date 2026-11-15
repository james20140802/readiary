// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SentenceRowView } from '../SentenceRows';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));

const { default: SentenceRows } = await import('../SentenceRows');

afterEach(cleanup);

const view = (over: Partial<SentenceRowView> = {}): SentenceRowView => ({
  month: '2026-11',
  year: null,
  quote: '문장',
  placeholder: null,
  href: '/entry/e1',
  meta: [],
  notice: null,
  ...over,
});

describe('SentenceRows', () => {
  it('목록의 이름은 label이고, 달은 숫자와 "월"로 읽힌다', () => {
    render(h(SentenceRows, { rows: [view({ month: '2026-09' })], label: '달마다 한 문장' }));
    const list = screen.getByRole('list', { name: '달마다 한 문장' });
    expect(within(list).getByText('9')).toBeTruthy();
    expect(within(list).getByRole('listitem').textContent).toContain('9월');
  });

  it('연도는 year가 있는 줄에만 보인다', () => {
    render(
      h(SentenceRows, {
        rows: [
          view({ month: '2026-01', year: '2026' }),
          view({ month: '2025-12', year: '2025' }),
          view({ month: '2025-11' }),
        ],
        label: 'l',
      })
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('2026');
    expect(items[1].textContent).toContain('2025');
    expect(items[2].textContent).not.toContain('2025');
  });

  it('문장은 기록 한 장으로 가는 링크다', () => {
    render(
      h(SentenceRows, { rows: [view({ quote: '읽은 문장', href: '/entry/e9' })], label: 'l' })
    );
    expect(screen.getByRole('link', { name: '읽은 문장' }).getAttribute('href')).toBe('/entry/e9');
  });

  it('long quote: 줄 수로 자르지 않고 줄바꿈한다', () => {
    const long = '가'.repeat(2000);
    render(h(SentenceRows, { rows: [view({ quote: long })], label: 'l' }));
    const link = screen.getByRole('link', { name: long });
    expect(link.className).toContain('break-words');
    expect(link.className).not.toContain('line-clamp');
    expect(link.textContent).toHaveLength(2000);
  });

  it('문장이 없는 달은 placeholder를 옅게 보이고 링크가 없다', () => {
    render(
      h(SentenceRows, {
        rows: [view({ quote: null, href: null, placeholder: '쉬어 간 달' })],
        label: 'l',
      })
    );
    expect(screen.getByText('쉬어 간 달').className).toContain('text-ink-faint');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('메타는 가운뎃점으로 잇고, 없으면 그리지 않는다', () => {
    const { rerender } = render(
      h(SentenceRows, { rows: [view({ meta: ['애도 일기', 'p.3', '기록 8'] })], label: 'l' })
    );
    expect(screen.getByText('애도 일기 · p.3 · 기록 8')).toBeTruthy();
    rerender(h(SentenceRows, { rows: [view({ meta: [] })], label: 'l' }));
    expect(screen.queryByTestId('sentence-meta')).toBeNull();
  });

  it('안내 문구를 메타 아래에 보인다', () => {
    render(
      h(SentenceRows, {
        rows: [view({ notice: '나만 보여요 · 친구에게는 다른 문장이 보여요' })],
        label: 'l',
      })
    );
    expect(screen.getByText('나만 보여요 · 친구에게는 다른 문장이 보여요')).toBeTruthy();
  });

  it('행동은 문장 링크 밖에 있다', () => {
    render(
      h(SentenceRows, {
        rows: [view({ actions: h('button', { type: 'button' }, '바꾸기') })],
        label: 'l',
      })
    );
    const button = screen.getByRole('button', { name: '바꾸기' });
    expect(button.closest('a')).toBeNull();
    expect(screen.getByRole('link').querySelector('button')).toBeNull();
  });
});
