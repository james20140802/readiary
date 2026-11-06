import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  fetchExcerptPrompt,
  fetchMyExcerptMonths,
  fetchMyExcerptYears,
  fetchMyMonthlyExcerpt,
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
});
