import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET as BOOKS } from '../books/route';
import { GET as ENTRIES } from '../entries/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));

const getUser = vi.fn();
let calls: Array<[string, unknown[]]> = [];
let result: { data: unknown; error: unknown } = { data: [], error: null };
/** 부른 메서드를 기록하고 끝에서 result를 돌려주는 체인 흉내 */
function from(table: string) {
  calls.push(['from', [table]]);
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'neq', 'ilike', 'order', 'limit']) {
    chain[m] = (...a: unknown[]) => (calls.push([m, a]), chain);
  }
  chain.range = (...a: unknown[]) => (calls.push(['range', a]), Promise.resolve(result));
  chain.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return chain;
}
const ub = '10000000-0000-4000-8000-0000000000aa';

beforeEach(() => {
  calls = [];
  result = { data: [], error: null };
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from } as never);
});

describe('GET /api/debates/books', () => {
  it('문장이 있는 내 책과 문장 수를 돌려준다', async () => {
    result = {
      data: [
        {
          id: ub,
          books: { title: '에로스의 종말', author: '한병철', cover_url: null },
          entries: [{ count: 12 }],
        },
      ],
      error: null,
    };
    const res = await BOOKS();
    expect(await res.json()).toEqual([
      { userBookId: ub, title: '에로스의 종말', author: '한병철', coverUrl: null, quoteCount: 12 },
    ]);
    expect(calls).toContainEqual(['eq', ['user_id', 'me']]);
    expect(calls).toContainEqual(['not', ['entries.quote', 'is', null]]);
  });
  it('세션이 없으면 401', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await BOOKS()).status).toBe(401);
  });
});

describe('GET /api/debates/entries', () => {
  it('?book=으로 그 책의 문장만', async () => {
    await ENTRIES(new Request(`http://localhost/api/debates/entries?book=${ub}`));
    expect(calls).toContainEqual(['eq', ['user_book_id', ub]]);
  });
  it('잘못된 book은 400', async () => {
    expect(
      (await ENTRIES(new Request('http://localhost/api/debates/entries?book=nope'))).status
    ).toBe(400);
  });
});
