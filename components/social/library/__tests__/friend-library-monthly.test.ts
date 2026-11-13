// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import { months, own, ownRow, res } from '@/components/monthly-sentence/__tests__/fixtures';
import type { FriendSentenceRow, FriendSentences } from '@/lib/monthly-sentence/types';

const apiFetch = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...a: unknown[]) => apiFetch(...a),
  SessionExpiredError: class extends Error {},
}));

const { default: View } = await import('../FriendLibraryView');

const BASE = '/social/u/minji-0001';
const row = (month: string, over: Partial<FriendSentenceRow> = {}): FriendSentenceRow => ({
  month,
  entryId: `e-${month}`,
  quote: `${month}의 문장`,
  bookTitle: '애도 일기',
  fromPage: 12,
  toPage: null,
  hasExcerpt: false,
  ...over,
});
const friend = (over: Partial<FriendSentences> = {}): FriendSentences => ({
  mode: 'friend',
  hasAnyExcerpt: false,
  rows: [row('2026-03'), row('2026-02')],
  nextBefore: null,
  ...over,
});

const show = (over: Partial<Parameters<typeof View>[0]> = {}) =>
  render(
    h(
      TopBarProvider,
      null,
      h(View, {
        profile: {
          id: 'owner-id',
          name: '민지',
          nickname: 'minji',
          tag: '0001',
          bio: null,
          created_at: null,
          profile_image: null,
        } as never,
        isOwn: false,
        stats: null,
        featuredQuote: null,
        current: null,
        sentences: [],
        shelfBooks: [],
        shelfTotal: 0,
        shelfHref: '#',
        excerpts: [],
        monthlySentences: friend(),
        monthlyEntryBase: `${BASE}/entry`,
        monthlyExcerptsHref: `${BASE}/excerpts`,
        ...over,
      })
    )
  );

const section = () => screen.getByRole('region', { name: '달마다 한 문장' });

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('서재의 달마다 한 문장', () => {
  it('달별 목록은 하나다 — 달마다 엮은 발췌집 구역은 없다', () => {
    show();
    expect(screen.queryByText('달마다 엮은 발췌집')).toBeNull();
    expect(within(section()).getAllByRole('listitem')).toHaveLength(2);
  });

  it('문장은 친구의 기록 한 장으로 가고, 책 제목과 쪽수만 붙는다', () => {
    show();
    const list = within(section());
    expect(list.getByRole('link', { name: '2026-03의 문장' }).getAttribute('href')).toBe(
      `${BASE}/entry/e-2026-03`
    );
    expect(list.getAllByText('애도 일기 · p.12')).toHaveLength(2);
  });

  it('친구 화면에는 고르기·엮기와 내 화면의 표시가 없다', () => {
    show();
    const text = section().textContent ?? '';
    for (const word of [
      '바꾸기',
      '엮기',
      '내가 고른 문장',
      '발췌집 표지',
      '기록 ',
      '고르지 않은 달은',
      '나만 보여요',
    ]) {
      expect(text).not.toContain(word);
    }
    expect(within(section()).queryByRole('button')).toBeNull();
  });

  it('발췌집을 보여 준 달에만 펼치기가 붙는다', () => {
    show({
      monthlySentences: friend({
        hasAnyExcerpt: true,
        rows: [row('2026-03', { hasExcerpt: true }), row('2026-02')],
      }),
    });
    const list = within(section());
    expect(list.getByRole('link', { name: '2026년 3월 펼치기' }).getAttribute('href')).toBe(
      `${BASE}/excerpts/2026-03`
    );
    expect(list.queryByRole('link', { name: '2026년 2월 펼치기' })).toBeNull();
  });

  it('보여 준 발췌집이 있을 때만 모두 보기가 있다', () => {
    const first = show({ monthlySentences: friend({ hasAnyExcerpt: true }) });
    expect(
      within(section()).getByRole('link', { name: '달의 발췌집 모두 보기' }).getAttribute('href')
    ).toBe(`${BASE}/excerpts`);
    first.unmount();
    show({ monthlySentences: friend({ hasAnyExcerpt: false }) });
    expect(within(section()).queryByRole('link', { name: '달의 발췌집 모두 보기' })).toBeNull();
  });

  it('보일 달이 없으면 구역을 그리지 않는다', () => {
    show({ monthlySentences: friend({ rows: [] }) });
    expect(screen.queryByRole('region', { name: '달마다 한 문장' })).toBeNull();
  });

  it('줄은 없어도 보여 준 발췌집이 있으면 모두 보기는 남는다', () => {
    show({ monthlySentences: friend({ rows: [], hasAnyExcerpt: true }) });
    expect(within(section()).getByRole('link', { name: '달의 발췌집 모두 보기' })).toBeTruthy();
    expect(within(section()).queryByRole('list')).toBeNull();
  });

  it('불러오지 못한 것을 비어 있다고 말하지 않는다', () => {
    show({ monthlySentences: null });
    expect(
      within(section()).getByText('달마다 남긴 문장을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.')
    ).toBeTruthy();
    expect(screen.getByRole('region', { name: '발췌집' })).toBeTruthy();
  });

  it('더 보기는 그 사람의 다음 줄을 부른다', async () => {
    apiFetch.mockResolvedValue(res(friend({ rows: [row('2026-01')], nextBefore: null })));
    show({ monthlySentences: friend({ nextBefore: '2026-02' }) });
    fireEvent.click(within(section()).getByRole('button', { name: '더 보기' }));
    await waitFor(() => expect(within(section()).getAllByRole('listitem')).toHaveLength(3));
    expect(apiFetch.mock.calls[0][0]).toBe('/api/monthly-sentences?owner=owner-id&before=2026-02');
    expect(within(section()).queryByRole('button', { name: '더 보기' })).toBeNull();
  });

  it('더 보기가 실패하면 다시 시도할 수 있다', async () => {
    apiFetch.mockResolvedValueOnce(res({ error: 'x' }, false));
    show({ monthlySentences: friend({ nextBefore: '2026-02' }) });
    fireEvent.click(within(section()).getByRole('button', { name: '더 보기' }));
    await waitFor(() =>
      expect(within(section()).getByText('문장을 불러오지 못했어요.')).toBeTruthy()
    );
    apiFetch.mockResolvedValueOnce(res(friend({ rows: [row('2026-01')], nextBefore: null })));
    fireEvent.click(within(section()).getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(within(section()).getAllByRole('listitem')).toHaveLength(3));
  });
});

describe('내 서재 주소에서 본 달마다 한 문장', () => {
  const mine = own({
    rows: [
      ownRow('2026-11', {
        source: 'picked',
        isPrivate: true,
        friendFallback: 'other',
        entryCount: 5,
      }),
      ownRow('2026-10', { excerpt: 'made' }),
      ownRow('2026-09', { excerpt: 'unmade' }),
      ownRow('2026-08', {
        entryId: null,
        quote: null,
        bookTitle: null,
        source: null,
        entryCount: 0,
      }),
    ],
  });
  const showMine = () =>
    show({
      isOwn: true,
      monthlySentences: mine,
      monthlyEntryBase: '/entry',
      monthlyExcerptsHref: '/excerpts',
    });

  it('읽기 전용이다 — 문장이 없는 달은 빼고, 내 화면의 표시와 행동이 없다', () => {
    showMine();
    const list = within(section());
    expect(list.getAllByRole('listitem')).toHaveLength(3);
    expect(list.getByRole('link', { name: '2026-11의 문장' }).getAttribute('href')).toBe(
      '/entry/e-2026-11'
    );
    const text = section().textContent ?? '';
    for (const word of ['바꾸기', '엮기', '내가 고른 문장', '기록 ', '나만 보여요', '쉬어 간 달']) {
      expect(text).not.toContain(word);
    }
  });

  it('엮은 달에 펼치기, 엮은 달이 있으면 모두 보기', () => {
    showMine();
    const list = within(section());
    expect(list.getByRole('link', { name: '2026년 10월 펼치기' }).getAttribute('href')).toBe(
      '/excerpts/2026-10'
    );
    expect(list.queryByRole('link', { name: '2026년 9월 펼치기' })).toBeNull();
    expect(list.getByRole('link', { name: '달의 발췌집 모두 보기' }).getAttribute('href')).toBe(
      '/excerpts'
    );
  });

  it('더 보기는 내 다음 줄을 읽기 전용으로 붙인다', async () => {
    apiFetch.mockResolvedValue(
      res(own({ rows: months(2, 7).map((m) => ownRow(m)), nextBefore: null }))
    );
    show({
      isOwn: true,
      monthlySentences: { ...mine, nextBefore: '2026-08' },
      monthlyEntryBase: '/entry',
      monthlyExcerptsHref: '/excerpts',
    });
    fireEvent.click(within(section()).getByRole('button', { name: '더 보기' }));
    await waitFor(() => expect(within(section()).getAllByRole('listitem')).toHaveLength(5));
    expect(apiFetch.mock.calls[0][0]).toBe('/api/monthly-sentences?owner=owner-id&before=2026-08');
  });
});
