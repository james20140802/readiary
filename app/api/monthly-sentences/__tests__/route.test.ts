import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET, PUT } from '../route';
import { PUT as PUT_RULE } from '../rule/route';
import { GET as GET_CANDIDATES } from '../candidates/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));

const getUser = vi.fn();
const rpc = vi.fn();
const me = '10000000-0000-4000-8000-000000000001';
const friend = '10000000-0000-4000-8000-000000000002';
const entry = '10000000-0000-4000-8000-000000000003';
const NO_STORE = 'private, no-store, max-age=0';

const get = (query = '') => new Request(`http://localhost/api/monthly-sentences${query}`);
const put = (body: unknown) =>
  new Request('http://localhost/api/monthly-sentences', {
    method: 'PUT',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: me } }, error: null });
  rpc.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

describe('모든 라우트', () => {
  it.each([
    ['GET', () => GET(get())],
    ['PUT', () => PUT(put({ month: '2026-11', entryId: entry }))],
    ['PUT rule', () => PUT_RULE(put({ rule: 'recent' }))],
    ['GET candidates', () => GET_CANDIDATES(get('/candidates?month=2026-11'))],
  ])('%s: 로그인하지 않았으면 401이고 RPC를 부르지 않는다', async (_name, call) => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await call();
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('session_expired');
    expect(response.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', () => GET(get())],
    ['PUT', () => PUT(put({ month: '2026-11', entryId: entry }))],
    ['PUT rule', () => PUT_RULE(put({ rule: 'recent' }))],
    ['GET candidates', () => GET_CANDIDATES(get('/candidates?month=2026-11'))],
  ])('%s: 알 수 없는 RPC 오류는 내부 문구 없이 500, 로그에는 코드만', async (_name, call) => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: '비밀 문장' } });
    const response = await call();
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('비밀 문장');
    expect(response.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('비밀 문장');
  });
});

describe('GET /api/monthly-sentences', () => {
  it('owner를 생략하면 내 일기장의 다음 줄을 읽는다', async () => {
    const body = { mode: 'own', rule: 'likes', reflectionsOn: true, rows: [], nextBefore: null };
    rpc.mockResolvedValue({ data: body, error: null });
    const response = await GET(get('?before=2026-06'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
    expect(response.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(rpc).toHaveBeenCalledWith('get_monthly_sentences', {
      p_owner: me,
      p_before: '2026-06',
      p_limit: 6,
    });
  });

  it('owner가 있으면 그 사람의 일기장을 읽는다', async () => {
    rpc.mockResolvedValue({ data: { mode: 'friend', rows: [] }, error: null });
    await GET(get(`?owner=${friend}`));
    expect(rpc).toHaveBeenCalledWith('get_monthly_sentences', { p_owner: friend, p_limit: 6 });
  });

  it.each(['?owner=abc', '?before=2026-13', '?before=11월', `?owner=${friend}&before=`])(
    '형식이 틀린 요청 %s는 400이고 RPC를 부르지 않는다',
    async (query) => {
      const response = await GET(get(query));
      expect(response.status).toBe(400);
      expect(rpc).not.toHaveBeenCalled();
    }
  );
});

describe('PUT /api/monthly-sentences', () => {
  it('고른 줄을 돌려준다', async () => {
    const row = { month: '2026-11', entryId: entry, source: 'picked' };
    rpc.mockResolvedValue({ data: row, error: null });
    const response = await PUT(put({ month: '2026-11', entryId: entry }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ row });
    expect(rpc).toHaveBeenCalledWith('set_monthly_sentence', {
      p_month: '2026-11',
      p_entry_id: entry,
    });
  });

  it('entryId가 null이면 자동으로 되돌린다', async () => {
    rpc.mockResolvedValue({ data: { month: '2026-11', source: 'auto' }, error: null });
    await PUT(put({ month: '2026-11', entryId: null }));
    expect(rpc).toHaveBeenCalledWith('set_monthly_sentence', {
      p_month: '2026-11',
      p_entry_id: null,
    });
  });

  it.each([
    ['본문이 JSON이 아님', '{'],
    ['달 형식', { month: '2026-1', entryId: entry }],
    ['entryId 형식', { month: '2026-11', entryId: 'abc' }],
    ['entryId 없음', { month: '2026-11' }],
    ['배열', []],
  ])('%s: 400이고 RPC를 부르지 않는다', async (_name, body) => {
    const response = await PUT(put(body));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('고를 수 없는 기록이면 400과 안내 문구', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'invalid_entry' } });
    const response = await PUT(put({ month: '2026-11', entryId: entry }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('고를 수 없는 기록이에요.');
  });
});

describe('PUT /api/monthly-sentences/rule', () => {
  it('기준을 저장하고 돌려준다', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const response = await PUT_RULE(put({ rule: 'reflections' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rule: 'reflections' });
    expect(rpc).toHaveBeenCalledWith('set_monthly_sentence_rule', { p_rule: 'reflections' });
  });

  it.each([{ rule: 'random' }, { rule: 1 }, {}, '{'])('틀린 값 %j는 400', async (body) => {
    const response = await PUT_RULE(put(body));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('GET /api/monthly-sentences/candidates', () => {
  const page = (total: number, count: number) => ({
    pickedEntryId: null,
    publicCount: 1,
    total,
    items: Array.from({ length: count }, (_, i) => ({ entryId: `e${i}` })),
  });

  it('첫 쪽: 남은 것이 있으면 hasMore', async () => {
    rpc.mockResolvedValue({ data: page(31, 30), error: null });
    const response = await GET_CANDIDATES(get('/candidates?month=2026-11'));
    const body = await response.json();
    expect(body.hasMore).toBe(true);
    expect(body.total).toBe(31);
    expect(body.items).toHaveLength(30);
    expect(response.headers.get('Cache-Control')).toBe(NO_STORE);
    expect(rpc).toHaveBeenCalledWith('get_monthly_sentence_candidates', {
      p_month: '2026-11',
      p_offset: 0,
      p_limit: 30,
    });
  });

  it('마지막 쪽: hasMore가 false', async () => {
    rpc.mockResolvedValue({ data: page(31, 1), error: null });
    const response = await GET_CANDIDATES(get('/candidates?month=2026-11&offset=30'));
    expect((await response.json()).hasMore).toBe(false);
    expect(rpc).toHaveBeenCalledWith(
      'get_monthly_sentence_candidates',
      expect.objectContaining({ p_offset: 30 })
    );
  });

  it.each(['', '?month=2026-00', '?month=2026-11&offset=-1', '?month=2026-11&offset=x'])(
    '형식이 틀린 요청 %s는 400',
    async (query) => {
      const response = await GET_CANDIDATES(get(`/candidates${query}`));
      expect(response.status).toBe(400);
      expect(rpc).not.toHaveBeenCalled();
    }
  );
});
