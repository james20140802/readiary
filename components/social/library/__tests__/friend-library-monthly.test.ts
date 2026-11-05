// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import type { LibraryMonthlyExcerpt } from '../FriendLibraryView';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));

const { default: View } = await import('../FriendLibraryView');

const row = (month: string): LibraryMonthlyExcerpt => ({
  month,
  coverQuote: `표지 ${month}`,
  quoteCount: 2,
  href: `/social/u/minji-0001/excerpts/${month}`,
});

const show = (over: Partial<Parameters<typeof View>[0]> = {}) =>
  render(
    h(
      TopBarProvider,
      null,
      h(View, {
        profile: {
          id: 'o',
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
        monthlyExcerpts: [],
        monthlyExcerptsHref: '/social/u/minji-0001/excerpts',
        ...over,
      })
    )
  );

const section = () => screen.getByRole('region', { name: '달마다 엮은 발췌집' });

afterEach(cleanup);

describe('서재의 달마다 엮은 발췌집', () => {
  it('목록과 모두 보기를 보인다', () => {
    show({ monthlyExcerpts: [row('2026-03'), row('2026-02')] });
    const list = within(section());
    expect(
      list.getByRole('link', { name: /2026년 3월.*표지 2026-03.*펼치기/ }).getAttribute('href')
    ).toBe('/social/u/minji-0001/excerpts/2026-03');
    expect(list.getByText('표지 2026-03')).toBeTruthy();
    expect(list.getByRole('link', { name: '달의 발췌집 모두 보기' }).getAttribute('href')).toBe(
      '/social/u/minji-0001/excerpts'
    );
  });

  it('비어 있으면 안내만 있고 모두 보기가 없다', () => {
    show();
    const list = within(section());
    expect(list.getByText('아직 친구에게 보여 준 달이 없어요.')).toBeTruthy();
    expect(list.queryByRole('link')).toBeNull();
  });

  it('내 주소에서는 비어 있어도 친구 쪽 문구를 쓰지 않는다', () => {
    show({ isOwn: true });
    const list = within(section());
    expect(list.getByText('아직 엮은 달이 없어요')).toBeTruthy();
    expect(list.queryByText('아직 친구에게 보여 준 달이 없어요.')).toBeNull();
  });

  it('불러오지 못한 것을 비어 있다고 말하지 않는다', () => {
    show({ monthlyExcerptsError: true });
    const list = within(section());
    expect(list.getByText(/불러오지 못했어요/)).toBeTruthy();
    expect(list.queryByText('아직 친구에게 보여 준 달이 없어요.')).toBeNull();
  });
});
