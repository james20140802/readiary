import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET, POST } from '../route';
import { DELETE, PATCH } from '../[id]/route';
import { GET as GET_CANDIDATES } from '../candidates/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));

const getUser = vi.fn();
const rpc = vi.fn();
const deleteResult = vi.fn();
const id1 = '10000000-0000-4000-8000-000000000001';
const id2 = '10000000-0000-4000-8000-000000000002';

/** delete().eq().select() 체인 끝에서 deleteResult를 돌려주는 최소 흉내 */
function from() {
  const chain: Record<string, unknown> = {};
  chain.delete = () => chain;
  chain.eq = () => chain;
  chain.select = async () => deleteResult();
  return chain;
}

const json = (body: unknown) =>
  new Request('http://localhost/api/monthly-excerpts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
const patch = (body: unknown) =>
  new Request('http://localhost/x', { method: 'PATCH', body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const valid = { month: '2026-10', entryIds: [id1, id2], isShared: false };

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  rpc.mockReset();
  deleteResult.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from, rpc } as never);
});

describe('POST /api/monthly-excerpts', () => {
  it('requires a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(json(valid));
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('session_expired');
  });

  it.each([
    ['bad month', { ...valid, month: '2026-13' }],
    ['month not string', { ...valid, month: 202610 }],
    ['entryIds not array', { ...valid, entryIds: 'x' }],
    ['too many entryIds', { ...valid, entryIds: Array(501).fill(id1) }],
    ['non-uuid entryId', { ...valid, entryIds: [id1, 'nope'] }],
    ['isShared not boolean', { ...valid, isShared: 'yes' }],
  ])('rejects %s', async (_name, body) => {
    expect((await POST(json(body))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects broken JSON', async () => {
    const response = await POST(new Request('http://localhost/x', { method: 'POST', body: '{' }));
    expect(response.status).toBe(400);
  });

  it('saves and returns the id', async () => {
    rpc.mockResolvedValue({ data: id1, error: null });
    const response = await POST(json(valid));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: id1 });
    expect(rpc).toHaveBeenCalledWith('save_monthly_excerpt', {
      p_month: '2026-10',
      p_entry_ids: [id1, id2],
      p_is_shared: false,
    });
  });

  it('reports stale entries with their ids', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'stale_entries', details: JSON.stringify([id2]), code: 'P0001' },
    });
    const response = await POST(json(valid));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      code: 'stale_entries',
      error: '고르는 사이 바뀐 기록이 있어요. 다시 불러올게요.',
      staleIds: [id2],
    });
  });

  it('keeps stale_entries without ids when DETAIL is unreadable', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'stale_entries', details: 'garbage', code: 'P0001' },
    });
    const body = await (await POST(json(valid))).json();
    expect(body.code).toBe('stale_entries');
    expect(body.staleIds).toEqual([]);
  });

  it.each([
    ['no_public_quotes', '친구에게 보일 문장이 없어요. 나만 보기로 엮어 주세요.'],
    ['month_not_finished', '아직 끝나지 않은 달이에요.'],
    ['no_entries', '문장을 하나 이상 골라 주세요.'],
  ])('maps %s to 422', async (code, message) => {
    rpc.mockResolvedValue({ data: null, error: { message: code, code: 'P0001' } });
    const response = await POST(json(valid));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code, error: message });
  });

  it('treats invalid_month from the RPC as 400', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid_month', code: 'P0001' } });
    expect((await POST(json(valid))).status).toBe(400);
  });

  it('hides unknown errors and logs only the code', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'secret internal detail', code: '42883', details: '문장 본문' },
    });
    const response = await POST(json(valid));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
    expect(console.error).toHaveBeenCalledWith(expect.any(String), '42883');
  });
});

describe('GET /api/monthly-excerpts', () => {
  const get = (qs: string) => GET(new Request(`http://localhost/api/monthly-excerpts?${qs}`));

  it('requires a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await get('year=2025')).status).toBe(401);
  });

  it.each(['', 'year=abc', 'year=1899', 'year=10000', 'year=2025.5'])('rejects %s', async (qs) => {
    expect((await get(qs)).status).toBe(400);
  });

  it('returns the months of a year', async () => {
    const months = [
      { month: '2025-03', quoteCount: 4, excerptId: null, isShared: false, coverQuote: null },
    ];
    rpc.mockResolvedValue({ data: months, error: null });
    const response = await get('year=2025');
    expect(await response.json()).toEqual({ months });
    expect(rpc).toHaveBeenCalledWith('get_my_monthly_excerpt_year', { p_year: 2025 });
  });

  it('fails without internal messages', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } });
    const response = await get('year=2025');
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('boom');
  });
});

describe('PATCH /api/monthly-excerpts/[id]', () => {
  it('requires a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await PATCH(patch({ isShared: true }), ctx(id1))).status).toBe(401);
  });

  it('rejects a bad id or body', async () => {
    expect((await PATCH(patch({ isShared: true }), ctx('nope'))).status).toBe(400);
    expect((await PATCH(patch({ isShared: 'x' }), ctx(id1))).status).toBe(400);
  });

  it('toggles sharing', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await PATCH(patch({ isShared: true }), ctx(id1));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('set_monthly_excerpt_shared', {
      p_id: id1,
      p_is_shared: true,
    });
  });

  it('maps not_found to 404 and no_public_quotes to 422', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_found', code: 'P0001' } });
    expect((await PATCH(patch({ isShared: true }), ctx(id1))).status).toBe(404);
    rpc.mockResolvedValue({ data: null, error: { message: 'no_public_quotes', code: 'P0001' } });
    const response = await PATCH(patch({ isShared: true }), ctx(id1));
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe(
      '친구에게 보일 문장이 없어요. 나만 보기로 엮어 주세요.'
    );
  });

  it('hides unknown errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } });
    const response = await PATCH(patch({ isShared: true }), ctx(id1));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('boom');
  });
});

describe('DELETE /api/monthly-excerpts/[id]', () => {
  const del = (id: string) =>
    DELETE(new Request('http://localhost/x', { method: 'DELETE' }), ctx(id));

  it('requires a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await del(id1)).status).toBe(401);
  });

  it('rejects a bad id', async () => {
    expect((await del('nope')).status).toBe(400);
  });

  it('deletes with 204', async () => {
    deleteResult.mockResolvedValue({ data: [{ id: id1 }], error: null });
    expect((await del(id1)).status).toBe(204);
  });

  it('returns 404 when nothing was deleted', async () => {
    deleteResult.mockResolvedValue({ data: [], error: null });
    expect((await del(id1)).status).toBe(404);
  });

  it('hides database errors', async () => {
    deleteResult.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } });
    const response = await del(id1);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('boom');
  });
});

describe('GET /api/monthly-excerpts/candidates', () => {
  const get = (qs: string) =>
    GET_CANDIDATES(new Request(`http://localhost/api/monthly-excerpts/candidates?${qs}`));

  it('requires a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await get('month=2026-10')).status).toBe(401);
  });

  it.each([
    'month=2026-13',
    '',
    'month=2026-10&userBookId=nope',
    'month=2026-10&page=-1',
    'month=2026-10&page=1.5',
    'month=2026-10&page=100001',
  ])('rejects %s', async (qs) => {
    expect((await get(qs)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  // RPC의 offset은 page * limit이라 limit+1로 부르면 쪽이 어긋난다. 한 쪽(30)을 받고, 가득 찼을 때만 다음 쪽의 첫 줄을 엿본다.
  it('reports hasMore by peeking one row past a full page', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ entryId: `e${i}` }));
    rpc
      .mockResolvedValueOnce({ data: rows, error: null })
      .mockResolvedValueOnce({ data: [{ entryId: 'next' }], error: null });
    const body = await (await get(`month=2026-10&userBookId=${id1}&page=2`)).json();
    expect(rpc).toHaveBeenNthCalledWith(1, 'get_monthly_excerpt_candidates', {
      p_month: '2026-10',
      p_user_book_id: id1,
      p_page: 2,
      p_limit: 30,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'get_monthly_excerpt_candidates', {
      p_month: '2026-10',
      p_user_book_id: id1,
      p_page: 90,
      p_limit: 1,
    });
    expect(body.hasMore).toBe(true);
    expect(body.items).toHaveLength(30);
  });

  it('has no more when the peek is empty or the page is short', async () => {
    const full = Array.from({ length: 30 }, (_, i) => ({ entryId: `e${i}` }));
    rpc
      .mockResolvedValueOnce({ data: full, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    expect((await (await get('month=2026-10')).json()).hasMore).toBe(false);
    rpc.mockReset().mockResolvedValueOnce({ data: [{ entryId: 'a' }], error: null });
    const body = await (await get('month=2026-10')).json();
    expect(body).toEqual({ items: [{ entryId: 'a' }], hasMore: false });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('hides RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } });
    const response = await get('month=2026-10');
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('boom');
  });
});
