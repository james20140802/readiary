import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seededIndex } from '../selectRecall';

const TODAY_KST = '2026-08-27'; // 고정 오늘 — 실제 실행 날짜와 무관하게 결정적으로 검증한다

vi.mock('@/lib/dates', () => ({
  todayKST: () => TODAY_KST,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

const { createSupabaseServerClient } = await import('@/lib/supabase/server');
const { fetchRecallEntry } = await import('../fetchRecallEntry');

type Result = { data?: unknown; error?: unknown; count?: number | null };

/**
 * 체이닝 메서드는 전부 builder 자신을 돌려주고, 마지막에 await되거나 .maybeSingle()이
 * 호출될 때만 큐에 넣어둔 result로 resolve한다 — 실제 supabase-js 쿼리 빌더의 thenable 동작을 흉내낸다.
 */
function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    lt: () => builder,
    lte: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (r: Result) => void, reject: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

/** table별로 호출 순서대로 큐에서 결과를 꺼내주는 가짜 supabase 클라이언트 */
function createSupabaseMock(opts: {
  user: { id: string } | null;
  userError?: unknown;
  entries?: Result[];
  user_books?: Result[];
}) {
  const queues: Record<string, Result[]> = {
    entries: [...(opts.entries ?? [])],
    user_books: [...(opts.user_books ?? [])],
  };
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: opts.user }, error: opts.userError ?? null }),
    },
    from: (table: string) => {
      const queue = queues[table];
      const result = queue?.shift();
      if (!result) throw new Error(`unexpected extra call to from('${table}')`);
      return makeBuilder(result);
    },
  };
}

beforeEach(() => {
  vi.mocked(createSupabaseServerClient).mockReset();
});

describe('fetchRecallEntry', () => {
  it('로그인하지 않았으면 null', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({ user: null }) as never
    );
    expect(await fetchRecallEntry()).toBeNull();
  });

  it('문장이 있는 과거 기록이 하나도 없으면 null', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({
        user: { id: 'u1' },
        entries: [{ data: null, error: null }], // 최초 기록 조회(maybeSingle) 결과 없음
      }) as never
    );
    expect(await fetchRecallEntry()).toBeNull();
  });

  it('같은 월-일 후보가 여러 해 있으면 가장 오래된 해를 SQL에서 골라온다', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({
        user: { id: 'u1' },
        entries: [
          // 1) 최초 기록 연도 조회 — 2023년부터 있었음
          { data: { date: '2023-01-05' }, error: null },
          // 2) 같은 월-일(.in) 조회 — 2024, 2025 두 해가 걸림
          {
            data: [
              { id: 'a', date: '2024-08-27', quote: 'Q1', user_book_id: 'ub1' },
              { id: 'b', date: '2025-08-27', quote: 'Q2', user_book_id: 'ub2' },
            ],
            error: null,
          },
        ],
        user_books: [
          { data: { id: 'ub1', books: { title: 'Book A', author: 'Author A' } }, error: null },
        ],
      }) as never
    );

    const result = await fetchRecallEntry();
    expect(result).toEqual({
      id: 'a',
      date: '2024-08-27',
      quote: 'Q1',
      bookTitle: 'Book A',
      bookAuthor: 'Author A',
      yearsAgo: 2, // 2026 - 2024
    });
  });

  it('같은 월-일 후보가 없으면 count+offset 폴백으로 seededIndex와 같은 행을 정확히 하나만 가져온다', async () => {
    // 최초 기록이 올해(2026)라 같은 월-일 후보 연도 자체가 없음 → 폴백으로 바로 감
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({
        user: { id: 'u1' },
        entries: [
          { data: { date: '2026-01-10' }, error: null },
          { count: 5, error: null }, // count: 'exact', head: true
          {
            data: [{ id: 'c', date: '2020-08-01', quote: 'Q3', user_book_id: 'ub3' }],
            error: null,
          },
        ],
        user_books: [
          { data: { id: 'ub3', books: { title: 'Book C', author: null } }, error: null },
        ],
      }) as never
    );

    const result = await fetchRecallEntry();
    expect(result?.id).toBe('c');
    expect(result?.bookTitle).toBe('Book C');
    expect(result?.bookAuthor).toBeNull();
    expect(result?.yearsAgo).toBeNull(); // 08-01 ≠ 오늘(08-27) 월-일
  });

  it('같은 월-일 후보 연도는 있지만 실제 기록이 없으면 count+offset 폴백으로 넘어간다', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({
        user: { id: 'u1' },
        entries: [
          { data: { date: '2023-01-05' }, error: null }, // 같은 월-일 후보 연도(2023~) 존재
          { data: [], error: null }, // 그러나 .in() 조회 결과는 0건
          { count: 2, error: null },
          {
            data: [{ id: 'd', date: '2026-01-01', quote: 'Q4', user_book_id: 'ub4' }],
            error: null,
          },
        ],
        user_books: [
          { data: { id: 'ub4', books: { title: 'Book D', author: null } }, error: null },
        ],
      }) as never
    );

    const result = await fetchRecallEntry();
    expect(result?.id).toBe('d');
  });

  it('폴백 대상 기록이 하나도 없으면(count 0) null', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({
        user: { id: 'u1' },
        entries: [
          { data: { date: '2026-01-10' }, error: null },
          { count: 0, error: null },
        ],
      }) as never
    );
    expect(await fetchRecallEntry()).toBeNull();
  });

  it('책 제목이 없으면 null', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({
        user: { id: 'u1' },
        entries: [
          { data: { date: '2023-01-05' }, error: null },
          {
            data: [{ id: 'a', date: '2024-08-27', quote: 'Q1', user_book_id: 'ub1' }],
            error: null,
          },
        ],
        user_books: [{ data: { id: 'ub1', books: null }, error: null }],
      }) as never
    );
    expect(await fetchRecallEntry()).toBeNull();
  });

  it('폴백 경로는 seededIndex(count, seedKey)가 가리키는 오프셋을 정확히 .range()로 요청한다', async () => {
    // count=1이면 seedKey와 무관하게 seededIndex는 항상 0 — 오프셋 계산이 selectRecall과 일치함을 보장
    expect(seededIndex(1, 'u2|2026-08-27')).toBe(0);

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createSupabaseMock({
        user: { id: 'u2' },
        entries: [
          { data: { date: '2026-01-10' }, error: null },
          { count: 1, error: null },
          {
            data: [{ id: 'z', date: '2020-01-01', quote: 'ZQ', user_book_id: 'ubz' }],
            error: null,
          },
        ],
        user_books: [
          { data: { id: 'ubz', books: { title: 'Book Z', author: null } }, error: null },
        ],
      }) as never
    );
    const result = await fetchRecallEntry();
    expect(result?.id).toBe('z');
  });
});
