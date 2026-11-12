import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from '../route';
import { GET as GET_MONTHS } from '../months/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({
  getServerUser: () => getUser(),
}));
vi.mock('@/lib/features/entry-reflections', () => ({
  getReflectionFeature: async () => ({ enabled: true }),
}));

const getUser = vi.fn();
const bookId = '10000000-0000-4000-8000-000000000001';
const tables: Record<string, { rows: unknown[]; single?: unknown }> = {};
const filters: Array<[string, string, unknown]> = [];
const rpc = vi.fn();

/** 체인 끝(range·maybeSingle)에서 표에 넣어 둔 행을 돌려주는 최소 PostgREST 흉내 */
function from(table: string) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'gte', 'lt', 'in'])
    query[method] = (...args: unknown[]) => {
      if (method !== 'select' && method !== 'order') filters.push([table, method, args]);
      return query;
    };
  query.eq = (column: string, value: unknown) => {
    filters.push([table, 'eq', [column, value]]);
    return query;
  };
  query.maybeSingle = async () => ({ data: tables[table]?.single ?? null, error: null });
  // 서버 max-rows처럼 요청한 범위만 잘라 돌려준다
  query.range = async (start: number, end: number) => ({
    data: (tables[table]?.rows ?? []).slice(start, end + 1),
    error: null,
  });
  return query;
}

const get = (qs: string) => GET(new Request(`http://localhost/api/export?${qs}`));

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key];
  filters.length = 0;
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  rpc.mockReset();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ from, rpc } as never);
});

describe('record export API', () => {
  it('requires a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await get(`book=${bookId}`);
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe('session_expired');
  });

  it.each([
    '',
    'month=2026-13',
    'month=26-10',
    'book=nope',
    `book=${bookId}&month=2026-10`,
    'scope=everything',
    'scope=all&month=2026-10',
    `scope=all&book=${bookId}`,
  ])('rejects range %s', async (qs) => {
    expect((await get(qs)).status).toBe(400);
  });

  it('does not reveal books the caller does not own', async () => {
    const response = await get(`book=${bookId}`);
    expect(response.status).toBe(404);
    expect(filters).toContainEqual(['user_books', 'eq', ['user_id', 'owner']]);
  });

  it('returns one book as markdown without caching', async () => {
    tables.user_books = {
      rows: [],
      single: { id: bookId, is_finished: true, books: { title: '아무튼, 메모', author: '정혜윤' } },
    };
    tables.entries = {
      rows: [
        {
          id: 'e1',
          date: '2026-09-03',
          created_at: '2026-09-03T03:00:00Z',
          quote: '문장',
          note: null,
          from_page: 24,
          to_page: null,
          user_book_id: bookId,
        },
      ],
    };
    tables.entry_reflections = {
      rows: [{ id: 'r1', entry_id: 'e1', body: '덧', created_at: '2026-10-02T03:00:00Z' }],
    };
    const response = await get(`book=${bookId}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    const body = await response.json();
    expect(body.fileName).toBe('readiary-아무튼, 메모.md');
    expect(body.entryCount).toBe(1);
    expect(body.markdown).toContain('# 아무튼, 메모\n\n정혜윤 · 2026년 9월 3일 · 완독');
    expect(body.markdown).toContain('- 2026년 10월 2일 덧붙임: 덧');
  });

  it('limits a month to the caller and the month range', async () => {
    tables.entries = {
      rows: [
        {
          id: 'e1',
          date: '2026-12-31',
          created_at: '2026-12-31T03:00:00Z',
          quote: null,
          note: '연말',
          from_page: null,
          to_page: null,
          user_book_id: 'ub1',
          user_books: {
            user_id: 'owner',
            is_finished: false,
            books: { title: '책', author: null },
          },
        },
      ],
    };
    const body = await (await get('month=2026-12')).json();
    expect(body.fileName).toBe('readiary-2026-12.md');
    expect(body.markdown).toBe('# 2026년 12월의 기록\n\n## 책\n\n### 12월 31일\n\n연말\n');
    expect(filters).toContainEqual(['entries', 'eq', ['user_books.user_id', 'owner']]);
    expect(filters).toContainEqual(['entries', 'gte', ['date', '2026-12-01']]);
    expect(filters).toContainEqual(['entries', 'lt', ['date', '2027-01-01']]);
  });
});

describe('record export API — 모든 기록', () => {
  const row = (i: number, ub: string, title: string, date: string) => ({
    id: `e${String(i).padStart(5, '0')}`,
    date,
    created_at: `${date}T03:00:00Z`,
    quote: null,
    note: `생각-${i}`,
    from_page: null,
    to_page: null,
    user_book_id: ub,
    user_books: { user_id: 'owner', is_finished: ub === 'ub2', books: { title, author: null } },
  });

  it('requires a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await get('scope=all');
    expect(response.status).toBe(401);
  });

  it('reads every page of the caller’s entries and groups them by book', async () => {
    // 한 페이지(1,000행)를 넘는 서재 — 잘리면 뒤쪽 책·기록이 빠진다
    const rows = [
      ...Array.from({ length: 700 }, (_, i) => row(i, 'ub1', '첫 책', '2025-01-02')),
      ...Array.from({ length: 600 }, (_, i) => row(700 + i, 'ub2', '둘째 책', '2025-03-04')),
      row(1300, 'ub3', '마지막 책', '2026-11-01'),
      // 내용 없는 기록은 세지 않는다
      { ...row(1301, 'ub3', '마지막 책', '2026-11-02'), note: '  ' },
    ];
    tables.entries = { rows };
    const response = await get('scope=all');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    const body = await response.json();
    expect(body.entryCount).toBe(1301);
    expect(body.fileName).toBe('readiary-모든 기록.md');
    const md: string = body.markdown;
    expect(md.startsWith('# 모든 기록\n\n## 첫 책\n')).toBe(true);
    // 책은 첫 기록이 이른 순서, 책 안의 서식은 책 한 권 내보내기와 같다(한 단계 낮춘 제목)
    expect(md.indexOf('## 첫 책')).toBeLessThan(md.indexOf('## 둘째 책'));
    expect(md.indexOf('## 둘째 책')).toBeLessThan(md.indexOf('## 마지막 책'));
    expect(md).toContain('## 둘째 책\n\n2025년 3월 4일 · 완독\n\n### 2025년 3월 4일\n\n생각-700');
    expect(md).toContain('생각-1299');
    expect(md).toContain('### 2026년 11월 1일\n\n생각-1300\n');
    expect(filters).toContainEqual(['entries', 'eq', ['user_books.user_id', 'owner']]);
  });

  it('returns count 0 and only the title for an empty library', async () => {
    const body = await (await get('scope=all')).json();
    expect(body).toEqual({
      markdown: '# 모든 기록\n',
      fileName: 'readiary-모든 기록.md',
      entryCount: 0,
    });
  });
});

describe('entry months API', () => {
  it('maps RPC rows', async () => {
    rpc.mockResolvedValue({ data: [{ month: '2026-10', entry_count: 3 }], error: null });
    const response = await GET_MONTHS();
    expect(await response.json()).toEqual({ months: [{ month: '2026-10', entryCount: 3 }] });
    expect(rpc).toHaveBeenCalledWith('get_entry_months');
  });

  it('reports failure', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42883' } });
    expect((await GET_MONTHS()).status).toBe(500);
  });
});
