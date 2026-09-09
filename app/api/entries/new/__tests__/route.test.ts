import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateProgress } from '@/utils/sync';
import { POST } from '../route';
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/utils/sync', () => ({ updateProgress: vi.fn() }));
const id = '013b161a-70dc-4a6d-9c40-0ddf087fa2fa';
const body = {
  client_entry_id: id,
  user_book_id: 'book-a',
  quote: '문장',
  note: '생각',
  date: '2026-09-01',
  is_private: true,
};
const request = (input: unknown = body) =>
  new Request('http://localhost/api/entries/new', { method: 'POST', body: JSON.stringify(input) });
type Row = Record<string, unknown>;
function database({
  userId = 'alice' as string | null,
  bookError = false,
  lookupError = false,
} = {}) {
  const rows = new Map<string, Row>();
  const insert = vi.fn((row: Row) => ({
    select: () => ({
      single: async () => {
        const key = (row.id as string) ?? 'generated-id';
        if (rows.has(key)) return { data: null, error: { code: '23505' } };
        rows.set(key, { ...row, id: key });
        return { data: { id: key }, error: null };
      },
    }),
  }));
  const from = vi.fn((table: string) => {
    const filters: Record<string, unknown> = {};
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return query;
      },
      maybeSingle: async () => {
        if (table === 'user_books')
          return {
            data:
              !bookError &&
              userId === 'alice' &&
              filters.user_id === 'alice' &&
              filters.id === 'book-a'
                ? { id: 'book-a', book_id: 'catalog-a' }
                : null,
            error: bookError ? { code: 'timeout' } : null,
          };
        const row = rows.get(filters.id as string);
        return {
          data: !lookupError && row?.user_book_id === filters.user_book_id ? row : null,
          error: lookupError ? { code: 'timeout' } : null,
        };
      },
      insert,
    };
    return query;
  });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }),
    },
    from,
  } as never);
  return { rows, insert, from };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateProgress).mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
describe('entry save request identity', () => {
  it('simultaneous retry creates one row and all responses resolve to the same id', async () => {
    const db = database();
    const responses = await Promise.all([POST(request()), POST(request()), POST(request())]);
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(await Promise.all(responses.map((r) => r.json()))).toEqual([
      { id },
      { id, replayed: true },
      { id, replayed: true },
    ]);
    expect(db.rows.size).toBe(1);
  });
  it('lost response is recovered by reusing the persisted request id', async () => {
    const db = database();
    await POST(request()); // The caller never consumes the successful response.
    expect(await (await POST(request())).json()).toEqual({ id, replayed: true });
    expect(db.rows.size).toBe(1);
  });
  it('retries finish progress synchronization after an insert committed but sync failed', async () => {
    const db = database();
    vi.mocked(updateProgress).mockRejectedValueOnce(new Error('sync unavailable'));
    expect((await POST(request())).status).toBe(500);
    expect((await POST(request())).status).toBe(200);
    expect(db.rows.size).toBe(1);
    expect(updateProgress).toHaveBeenCalledTimes(2);
  });
  it('never overwrites a saved entry on replay', async () => {
    const db = database();
    await POST(request());
    db.rows.set(id, { ...db.rows.get(id), note: '나중에 수정한 생각' });
    await POST(request());
    expect(db.rows.get(id)?.note).toBe('나중에 수정한 생각');
  });
  it('does not disclose or reuse another book entry with the same id', async () => {
    const db = database();
    db.rows.set(id, { id, user_book_id: 'someone-elses-book', quote: '비밀' });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain('비밀');
    expect(db.rows.size).toBe(1);
  });
  it('requires fresh authentication and book ownership before attempting insertion', async () => {
    for (const userId of [null, 'bob']) {
      const db = database({ userId });
      expect((await POST(request())).status).toBe(userId ? 403 : 401);
      expect(db.insert).not.toHaveBeenCalled();
    }
  });
  it('returns uncertainty when ownership or replay lookup is unavailable', async () => {
    const first = database({ bookError: true });
    expect((await POST(request())).status).toBe(503);
    expect(first.insert).not.toHaveBeenCalled();
    const second = database({ lookupError: true });
    second.rows.set(id, { id, user_book_id: 'book-a' });
    expect((await POST(request())).status).toBe(503);
    expect(second.rows.size).toBe(1);
  });
  it('rejects malformed client ids and preserves old callers without a client id', async () => {
    const db = database();
    expect((await POST(request({ ...body, client_entry_id: 'invalid' }))).status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
    const legacy = { ...body, client_entry_id: undefined };
    expect((await POST(request(legacy))).status).toBe(200);
    expect(db.insert.mock.calls[0][0]).not.toHaveProperty('id');
  });
});
