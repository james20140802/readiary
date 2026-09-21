import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/entries/[entry_id]/reflections/route';
import { PATCH, DELETE } from '@/app/api/entries/[entry_id]/reflections/[reflection_id]/route';
import { reflectionAccess } from '../server';
vi.mock('../server', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  reflectionAccess: vi.fn(),
}));
const entry_id = '11111111-1111-4111-8111-111111111111';
const reflection_id = '22222222-2222-4222-8222-222222222222';
const params = Promise.resolve({ entry_id, reflection_id });
const current = {
  id: reflection_id,
  entry_id,
  body: '생각',
  is_private: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};
function setup(results: unknown[], privateEntry = false) {
  const calls: Record<string, ReturnType<typeof vi.fn>>[] = [];
  const from = vi.fn(() => {
    const result = results.shift() ?? { data: null, error: null };
    const q: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const name of ['select', 'eq', 'or', 'limit', 'order', 'insert', 'update', 'delete'])
      q[name] = vi.fn(() => q);
    q.single = q.maybeSingle = vi.fn(async () => result);
    q.then = vi.fn((resolve: (result: unknown) => void) => Promise.resolve(result).then(resolve));
    calls.push(q);
    return q;
  });
  const rpc = vi.fn(async () => ({
    data: [{ entry_id, total: 21, latest: current }],
    error: null,
  }));
  vi.mocked(reflectionAccess).mockResolvedValue({
    supabase: { from, rpc },
    user: { id: 'owner' },
    entry: { is_private: privateEntry },
    canWrite: true,
  } as never);
  return { from, calls, rpc };
}
function request(method: string, body?: unknown, search = '') {
  return new Request('https://readiary.net/api/entries/' + entry_id + '/reflections' + search, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe('reflection routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('preserves no-store authenticated denial for read and writes', async () => {
    for (const handler of [GET, POST, PATCH, DELETE]) {
      vi.mocked(reflectionAccess).mockResolvedValue({
        response: new NextResponse('denied', {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }),
      });
      expect((await handler(request('GET'), { params })).status).toBe(401);
    }
  });
  it('replays the same ID without insert even after original becomes private', async () => {
    const { from } = setup([{ data: { ...current, is_private: false }, error: null }], true);
    const response = await POST(
      request('POST', { id: reflection_id, body: '다시 보내도 고친 내용 보존', is_private: false }),
      { params }
    );
    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledTimes(1);
    expect((await response.json()).body).toBe('생각');
  });
  it('reconciles concurrent duplicate inserts, never overwriting the row', async () => {
    const { calls } = setup([
      { data: null, error: null },
      { data: null, error: { code: '23505' } },
      { data: current, error: null },
    ]);
    const response = await POST(
      request('POST', { id: reflection_id, body: '생각', is_private: true }),
      { params }
    );
    expect(response.status).toBe(200);
    expect(calls[1].insert).toHaveBeenCalledOnce();
    expect(calls.every((q) => q.update.mock.calls.length === 0)).toBe(true);
  });
  it('rejects invalid payloads and public new thoughts on private originals', async () => {
    setup([]);
    expect(
      (await POST(request('POST', { id: reflection_id, body: ' ', is_private: true }), { params }))
        .status
    ).toBe(400);
    setup([{ data: null, error: null }], true);
    expect(
      (
        await POST(request('POST', { id: reflection_id, body: '생각', is_private: false }), {
          params,
        })
      ).status
    ).toBe(400);
  });
  it('paginates oldest first with timestamp AND id and a bounded summary', async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...current,
      id: `22222222-2222-4222-8222-${String(i).padStart(12, '0')}`,
    }));
    const { calls } = setup([{ data: items, error: null }]);
    const response = await GET(request('GET'), { params });
    const data = await response.json();
    expect(data.items).toHaveLength(20);
    expect(JSON.parse(data.nextCursor)).toEqual([items[19].created_at, items[19].id]);
    expect(calls[0].limit).toHaveBeenCalledWith(21);
    expect(calls[0].order).toHaveBeenCalledWith('id', { ascending: true });
    expect(response.headers.get('cache-control')).toContain('no-store');
    setup([]);
    expect((await GET(request('GET', undefined, '?cursor=broken'), { params })).status).toBe(400);
  });
  it('PATCH uses version condition and returns conflict without overwriting', async () => {
    const { calls } = setup([
      { data: current, error: null },
      { data: null, error: null },
    ]);
    const response = await PATCH(
      request('PATCH', { body: '다른 생각', is_private: true, updated_at: current.updated_at }),
      { params }
    );
    expect(response.status).toBe(409);
    expect(calls[1].eq).toHaveBeenCalledWith('updated_at', current.updated_at);
  });
  it('identical PATCH reconciles a lost response without a second update', async () => {
    const { from } = setup([{ data: current, error: null }]);
    expect(
      (await PATCH(request('PATCH', { ...current, updated_at: '2025-01-01' }), { params })).status
    ).toBe(200);
    expect(from).toHaveBeenCalledTimes(1);
  });
  it('delete is idempotent and constrained to the original and reflection', async () => {
    const { calls } = setup([{ data: null, error: null }]);
    expect((await DELETE(request('DELETE'), { params })).status).toBe(200);
    expect(calls[0].eq).toHaveBeenCalledWith('entry_id', entry_id);
    expect(calls[0].eq).toHaveBeenCalledWith('id', reflection_id);
  });
  it('does not expose SQL error details on an uncertain write', async () => {
    setup([
      { data: null, error: null },
      { data: null, error: { code: 'unexpected', message: 'SECRET SQL' } },
    ]);
    const response = await POST(
      request('POST', { id: reflection_id, body: '생각', is_private: true }),
      { params }
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('SECRET');
  });
});
