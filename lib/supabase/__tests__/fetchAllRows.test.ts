import { describe, expect, it } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import { fetchAllRows, SUPABASE_PAGE_SIZE } from '../fetchAllRows';

function makeRows(count: number, startAt = 0): number[] {
  return Array.from({ length: count }, (_, i) => startAt + i);
}

/** 전체 total행에서 from부터 요청 범위만큼, 서버 캡(serverCap)까지만 돌려주는 가짜 서버 */
function fakeServer(total: number, serverCap = Infinity) {
  const calls: Array<[number, number]> = [];
  const buildPage = async (from: number, to: number) => {
    calls.push([from, to]);
    const requested = to - from + 1;
    const size = Math.min(requested, serverCap);
    return { data: makeRows(total).slice(from, from + size), error: null };
  };
  return { calls, buildPage };
}

describe('fetchAllRows', () => {
  it('짧은 첫 페이지 후 빈 페이지로 종료를 확정한다', async () => {
    const { calls, buildPage } = fakeServer(3);
    const { rows, error } = await fetchAllRows<number>(buildPage);

    expect(rows).toEqual([0, 1, 2]);
    expect(error).toBeNull();
    expect(calls).toEqual([
      [0, SUPABASE_PAGE_SIZE - 1],
      [3, 3 + SUPABASE_PAGE_SIZE - 1],
    ]);
  });

  it('가득 찬 페이지는 다음 offset으로 이어 읽고 전량을 합친다', async () => {
    const total = SUPABASE_PAGE_SIZE + 250;
    const { buildPage } = fakeServer(total);
    const { rows, error } = await fetchAllRows<number>(buildPage);

    expect(rows).toHaveLength(total);
    expect(rows[0]).toBe(0);
    expect(rows[total - 1]).toBe(total - 1);
    expect(error).toBeNull();
  });

  it('전체 행 수가 페이지 크기의 배수면 빈 페이지에서 멈춘다', async () => {
    const total = SUPABASE_PAGE_SIZE;
    const { calls, buildPage } = fakeServer(total);
    const { rows } = await fetchAllRows<number>(buildPage);

    expect(rows).toHaveLength(total);
    expect(calls).toHaveLength(2);
  });

  it('서버 max-rows가 페이지 크기보다 작아도 절단 없이 전량을 읽는다', async () => {
    const total = 950;
    const { calls, buildPage } = fakeServer(total, 400);
    const { rows, error } = await fetchAllRows<number>(buildPage);

    expect(rows).toEqual(makeRows(total));
    expect(error).toBeNull();
    // 400 + 400 + 150 + 빈 페이지 확인 = 4회
    expect(calls.map(([from]) => from)).toEqual([0, 400, 800, 950]);
  });

  it('중간 페이지 오류는 그때까지의 rows와 error를 함께 돌려준다', async () => {
    const pgError = { message: 'boom' } as PostgrestError;
    const { rows, error } = await fetchAllRows<number>(async (from) => {
      if (from === 0) return { data: makeRows(SUPABASE_PAGE_SIZE), error: null };
      return { data: null, error: pgError };
    });

    expect(rows).toHaveLength(SUPABASE_PAGE_SIZE);
    expect(error).toBe(pgError);
  });
});
