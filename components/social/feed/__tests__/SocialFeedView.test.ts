// @vitest-environment jsdom
import { createElement as h } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopBarProvider } from '@/components/shell/TopBarContext';
import type { SocialFeedEntryItem, SocialFeedExcerptItem, SocialFeedItem } from '@/types/entry';
import { stubBrowser } from '@/components/monthly-excerpt/__tests__/fixtures';

let onChange: ((inView: boolean) => void) | undefined;
vi.mock('react-intersection-observer', () => ({
  useInView: (opts: { onChange: (v: boolean) => void }) => {
    onChange = opts.onChange;
    return { ref: () => {} };
  },
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: vi.fn(),
  SessionExpiredError: class extends Error {},
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'me' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace() {}, refresh() {}, push() {} }),
  usePathname: () => '/social',
}));

stubBrowser(vi.stubGlobal);
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const { default: SocialFeedView } = await import('../SocialFeedView');

const profile = (id: string, name: string) => ({
  id,
  name,
  nickname: id,
  tag: '0001',
  bio: null,
  created_at: '2026-01-01T00:00:00Z',
  profile_image: null,
});
const entry = (id: string, quote: string): SocialFeedEntryItem => ({
  kind: 'entry',
  profile: profile('p2', '서준'),
  entry: {
    id,
    date: '2026-04-01',
    quote,
    note: null,
    from_page: null,
    to_page: null,
    is_private: false,
    created_at: '2026-04-01T00:00:00Z',
    book: { id: 'b1', title: '아무튼, 메모', author: null, total_pages: null, cover_url: null },
    reflectionSummary: null,
  },
  initialLiked: false,
  initialLikeCount: 0,
  initialCommentCount: 0,
});
const excerpt = (id: string, cover: string): SocialFeedExcerptItem => ({
  kind: 'monthly_excerpt',
  id,
  month: '2026-03',
  sharedAt: '2026-04-01T00:00:00Z',
  profile: profile('p1', '민지'),
  coverQuote: cover,
  coverBookTitle: '어느 책',
  quoteCount: 2,
  bookCount: 1,
  initialLiked: false,
  initialLikeCount: 0,
  initialCommentCount: 0,
});

const show = (
  initialFeed: SocialFeedItem[],
  loadPage?: (page: number, limit: number) => Promise<SocialFeedItem[]>,
  pageSize = 2
) =>
  render(
    h(
      TopBarProvider,
      null,
      h(SocialFeedView, {
        initialFeed,
        userId: 'me',
        referenceTime: '2026-04-20T00:00:00Z',
        pendingFriends: [],
        friendCount: 2,
        pageSize,
        loadPage,
      })
    )
  );

afterEach(() => {
  cleanup();
  onChange = undefined;
});

describe('SocialFeedView', () => {
  it('kind에 따라 기록과 달의 발췌집을 순서대로 그린다', () => {
    show([entry('e1', '기록 문장'), excerpt('x1', '표지 문장'), entry('e2', '다른 문장')]);
    const articles = screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'));
    expect(articles).toEqual(['서준의 문장', '민지의 달의 발췌집', '서준의 문장']);
    expect(screen.getByText('표지 문장')).toBeTruthy();
  });

  it('달의 발췌집은 친구들이 읽는 책 목록에 끼지 않는다', () => {
    show([excerpt('x1', '표지 문장')]);
    // 민지는 기록이 없어 책 목록에 나올 자리가 없다. 이름은 카드의 한 번뿐이다.
    expect(screen.getAllByText('민지')).toHaveLength(1);
  });

  it('다음 쪽에도 발췌집이 섞이고, 겹친 항목은 한 번만 보인다', async () => {
    const loadPage = vi
      .fn<(page: number, limit: number) => Promise<SocialFeedItem[]>>()
      .mockResolvedValue([excerpt('x1', '겹친 표지'), excerpt('x2', '둘째 표지')]);
    show([entry('e1', '기록 문장'), excerpt('x1', '겹친 표지')], loadPage);
    await act(async () => onChange?.(true));
    await waitFor(() => expect(screen.getByText('둘째 표지')).toBeTruthy());
    expect(loadPage).toHaveBeenCalledWith(1, 2);
    expect(screen.getAllByText('겹친 표지')).toHaveLength(1);
  });

  it('같은 id라도 종류가 다르면 다른 항목이다', () => {
    show([entry('same', '기록 문장'), excerpt('same', '표지 문장')]);
    expect(screen.getByText('기록 문장')).toBeTruthy();
    expect(screen.getByText('표지 문장')).toBeTruthy();
  });
});
