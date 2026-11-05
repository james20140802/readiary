// @vitest-environment jsdom
import { createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SocialFeedExcerptItem } from '@/types/entry';
import MonthlyExcerptFeedCard from '../MonthlyExcerptFeedCard';
import { stubBrowser } from './fixtures';

const apiFetch = vi.fn();
vi.mock('@/lib/api/fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  SessionExpiredError: class extends Error {},
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown }) =>
    h('a', { href, ...rest }, children as never),
}));
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'me' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));

stubBrowser(vi.stubGlobal);

const item = (over: Partial<SocialFeedExcerptItem> = {}): SocialFeedExcerptItem => ({
  kind: 'monthly_excerpt',
  id: 'x1',
  month: '2026-03',
  sharedAt: '2026-04-01T01:00:00Z',
  profile: {
    id: 'p1',
    name: '민지',
    nickname: 'minji',
    tag: '0001',
    bio: null,
    created_at: '2026-01-01T00:00:00Z',
    profile_image: null,
  },
  coverQuote: '끝은 대개 처음에 이미 적혀 있다.',
  coverBookTitle: '왜 나는 너를 사랑하는가',
  quoteCount: 12,
  bookCount: 4,
  initialLiked: false,
  initialLikeCount: 8,
  initialCommentCount: 3,
  ...over,
});
const NOW = new Date('2026-04-20T00:00:00Z');
const show = (i = item()) => render(h(MonthlyExcerptFeedCard, { item: i, userId: 'me', now: NOW }));

beforeEach(() => apiFetch.mockReset());
afterEach(cleanup);

describe('MonthlyExcerptFeedCard', () => {
  it('누가 엮었는지, 달, 표지 문장, 출처, 수를 보인다', () => {
    show();
    expect(screen.getByRole('article', { name: '민지의 달의 발췌집' })).toBeTruthy();
    expect(screen.getByText('님이 발췌집을 엮었어요', { exact: false })).toBeTruthy();
    expect(screen.getByText('달의 발췌집')).toBeTruthy();
    expect(screen.getByText('2026년 3월')).toBeTruthy();
    expect(screen.getByText('끝은 대개 처음에 이미 적혀 있다.')).toBeTruthy();
    expect(screen.getByText('왜 나는 너를 사랑하는가')).toBeTruthy();
    expect(screen.getByText('문장 12 · 책 4권')).toBeTruthy();
    // 소식의 시각은 처음 공개한 때다
    expect(screen.getByText('4월 1일').getAttribute('datetime')).toBe('2026-04-01T01:00:00Z');
  });

  it('펼치기와 이름은 친구의 주소로 간다', () => {
    show();
    expect(screen.getByRole('link', { name: /펼치기/ }).getAttribute('href')).toBe(
      '/social/u/minji-0001/excerpts/2026-03'
    );
    expect(screen.getByRole('link', { name: '민지' }).getAttribute('href')).toBe(
      '/social/u/minji-0001'
    );
  });

  it('문장은 부리, 간지는 겹친 재질이다', () => {
    const { container } = show();
    expect(screen.getByText('끝은 대개 처음에 이미 적혀 있다.').className).toContain('font-serif');
    // 위 장 하나와 비켜 쌓인 두 장
    expect(container.querySelectorAll('.vellum-slip')).toHaveLength(3);
    expect(container.querySelectorAll('[aria-hidden="true"].vellum-slip')).toHaveLength(2);
  });

  it('좋아요는 달의 발췌집 대상으로 남긴다', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    show();
    fireEvent.click(screen.getByRole('button', { name: '좋아요 8개' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(String(apiFetch.mock.calls[0][0])).toContain('/api/monthly-excerpts/x1');
  });

  it('처음 수를 보인다', () => {
    show();
    expect(screen.getByRole('button', { name: /댓글/ }).textContent).toContain('3');
    expect(document.body.textContent).toContain('8');
  });
});
