import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  fetchExcerptOwner,
  fetchExcerptPrompt,
  fetchFriendExcerptYear,
  fetchFriendExcerptYears,
  fetchFriendMonthlyExcerpt,
  fetchFriendRecentExcerpts,
  fetchMyExcerptCount,
  fetchMyExcerptMonths,
  fetchMyExcerptYears,
  fetchMyMonthlyExcerpt,
  fetchMyRecentExcerpts,
} from '../server';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

const rpc = vi.fn();
const select = vi.fn();

beforeEach(() => {
  rpc.mockReset();
  select.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    rpc,
    from: () => ({ select }),
  } as never);
});

describe('monthly excerpt server fetchers', () => {
  it('maps snake_case year rows', async () => {
    rpc.mockResolvedValue({
      data: [{ year: 2025, excerpt_count: 3, has_unmade: true }],
      error: null,
    });
    expect(await fetchMyExcerptYears()).toEqual([{ year: 2025, excerptCount: 3, hasUnmade: true }]);
  });

  it('distinguishes no excerpt (null) from a failure (throw)', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await fetchMyMonthlyExcerpt('2026-03')).toBeNull();
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } });
    await expect(fetchMyMonthlyExcerpt('2026-03')).rejects.toThrow();
  });

  it('swallows prompt failures as no prompt', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    expect(await fetchExcerptPrompt('2026-11-06')).toBeNull();
  });

  it('turns month dates into keys', async () => {
    select.mockResolvedValue({ data: [{ month: '2026-03-01' }], error: null });
    expect(await fetchMyExcerptMonths()).toEqual(new Set(['2026-03']));
  });

  it('reads the head count', async () => {
    select.mockResolvedValue({ count: 4, error: null });
    expect(await fetchMyExcerptCount()).toBe(4);
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  });

  it('asks the friend RPC by owner and tells no excerpt from a failure', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await fetchFriendMonthlyExcerpt('owner', '2026-03')).toBeNull();
    expect(rpc).toHaveBeenCalledWith('get_friend_monthly_excerpt', {
      p_owner: 'owner',
      p_month: '2026-03',
    });
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } });
    await expect(fetchFriendMonthlyExcerpt('owner', '2026-03')).rejects.toThrow();
  });

  it('maps friend years — a friend never hears of unmade months', async () => {
    rpc.mockResolvedValue({ data: [{ year: 2026, excerpt_count: 2 }], error: null });
    expect(await fetchFriendExcerptYears('owner')).toEqual([
      { year: 2026, excerptCount: 2, hasUnmade: false },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_friend_monthly_excerpt_years', { p_owner: 'owner' });
  });

  it('maps friend months to archive rows', async () => {
    rpc.mockResolvedValue({
      data: [{ month: '2026-03', quoteCount: 2, excerptId: 'x', coverQuote: '표지' }],
      error: null,
    });
    expect(await fetchFriendExcerptYear('owner', 2026)).toEqual([
      { month: '2026-03', quoteCount: 2, excerptId: 'x', coverQuote: '표지', isShared: true },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_friend_monthly_excerpt_year', {
      p_owner: 'owner',
      p_year: 2026,
    });
  });

  it('gathers the recent friend excerpts year by year and stops once it has enough', async () => {
    const rows = (year: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        month: `${year}-0${n - i}`,
        quoteCount: 1,
        excerptId: `${year}-${i}`,
        coverQuote: '표지',
      }));
    rpc.mockImplementation(async (name: string, args: { p_year?: number }) => {
      if (name === 'get_friend_monthly_excerpt_years') {
        return {
          data: [
            { year: 2026, excerpt_count: 3 },
            { year: 2025, excerpt_count: 3 },
            { year: 2024, excerpt_count: 3 },
          ],
          error: null,
        };
      }
      return { data: rows(args.p_year as number, 3), error: null };
    });
    const recent = await fetchFriendRecentExcerpts('owner');
    expect(recent.map((r) => r.month)).toEqual([
      '2026-03',
      '2026-02',
      '2026-01',
      '2025-03',
      '2025-02',
    ]);
    // 2024년은 물어보지 않는다
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it('gathers my recent excerpts, leaving out months I have not made', async () => {
    rpc.mockImplementation(async (name: string) =>
      name === 'get_my_monthly_excerpt_years'
        ? {
            data: [
              { year: 2026, excerpt_count: 1, has_unmade: true },
              { year: 2025, excerpt_count: 0, has_unmade: true },
            ],
            error: null,
          }
        : {
            data: [
              {
                month: '2026-03',
                quoteCount: 4,
                excerptId: null,
                isShared: false,
                coverQuote: null,
              },
              {
                month: '2026-02',
                quoteCount: 2,
                excerptId: 'x',
                isShared: false,
                coverQuote: '표지',
              },
            ],
            error: null,
          }
    );
    const recent = await fetchMyRecentExcerpts();
    expect(recent.map((r) => r.month)).toEqual(['2026-02']);
    // 엮은 것이 없는 해는 달을 물어보지 않는다
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});

describe('fetchExcerptOwner', () => {
  const maybeSingle = vi.fn();
  beforeEach(() => {
    maybeSingle.mockReset();
    const chain = { select: () => chain, eq: () => chain, maybeSingle };
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: () => chain } as never);
  });

  it('없는 사람은 null, 불러오지 못한 것은 throw로 구분한다', async () => {
    maybeSingle.mockResolvedValue({ data: { id: 'o', name: '민지' }, error: null });
    expect(await fetchExcerptOwner('민지', '0001')).toEqual({ id: 'o', name: '민지' });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchExcerptOwner('민지', '0001')).toBeNull();
    maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    await expect(fetchExcerptOwner('민지', '0001')).rejects.toThrow();
  });
});
