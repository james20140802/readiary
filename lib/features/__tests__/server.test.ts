import { beforeEach, expect, it, vi } from 'vitest';
import { getReflectionFeature } from '../entry-reflections';
import { reflectionAccess, fetchReflectionSummaries } from '@/lib/reflections/server';
import { GET } from '@/app/api/features/entry-reflections/route';
import { GET as safetySummary } from '@/app/api/entries/[entry_id]/reflections/summary/route';
import { GET as batch } from '@/app/api/reflections/summaries/route';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), user: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: mocks.user }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: () => mocks }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
});
it('fails closed for absent users, RPC errors, unexpected values and rejected lookups', async () => {
  for (const result of [
    { data: null, error: {} },
    { data: 'true', error: null },
    { data: false, error: null },
  ]) {
    mocks.rpc.mockResolvedValue(result);
    expect((await getReflectionFeature()).enabled).toBe(false);
  }
  mocks.rpc.mockRejectedValue(new Error('offline'));
  expect((await getReflectionFeature()).enabled).toBe(false);
  mocks.user.mockResolvedValue({ data: { user: null }, error: null });
  mocks.rpc.mockClear();
  expect(await getReflectionFeature()).toEqual({ enabled: false, userId: null });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('blocks reads and writes before reading entry data; skips list summary queries', async () => {
  for (const write of [true, false])
    expect(
      (await reflectionAccess('11111111-1111-4111-8111-111111111111', write)).response?.status
    ).toBe(404);
  expect(await fetchReflectionSummaries(['entry'])).toEqual({});
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.rpc.mock.calls.every(([name]) => name === 'entry_reflections_enabled')).toBe(true);
  expect(
    (await batch(new Request('https://readiary.net/api/reflections/summaries?ids=entry'))).status
  ).toBe(404);
});
it('serves only a no-store boolean and own user identity, never rollout configuration', async () => {
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  const response = await GET();
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(await response.json()).toEqual({ enabled: true, userId: 'owner' });
});

it('keeps only the owner safety count available while disabled', async () => {
  const entryId = '11111111-1111-4111-8111-111111111111';
  const q = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.maybeSingle.mockResolvedValue({
    data: { id: entryId, is_private: false, user_books: { user_id: 'owner' } },
    error: null,
  });
  mocks.from.mockReturnValue(q);
  mocks.rpc.mockImplementation(async (name: string) =>
    name === 'entry_reflections_enabled'
      ? { data: false, error: null }
      : {
          data: [{ entry_id: entryId, total: 2, latest: { body: 'must not be returned' } }],
          error: null,
        }
  );
  const response = await safetySummary(new Request('https://readiary.net'), {
    params: Promise.resolve({ entry_id: entryId }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ total: 2, latest: null });
});
