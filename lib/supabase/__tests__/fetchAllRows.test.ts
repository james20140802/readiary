import { describe, expect, it } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import { fetchAllRows, SUPABASE_PAGE_SIZE } from '../fetchAllRows';

function makeRows(count: number, startAt = 0): number[] {
  return Array.from({ length: count }, (_, i) => startAt + i);
}

describe('fetchAllRows', () => {
  it('짧은 첫 페이지면 한 번만 요청하고 끝낸다', async () => {
    const calls: Array<[number, number]> = [];
    const { rows, error } = await fetchAllRows<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: makeRows(3), error: null };
    });

    expect(rows).toEqual([0, 1, 2]);
    expect(error).toBeNull();
    expect(calls).toEqual([[0, SUPABASE_PAGE_SIZE - 1]]);
  });

  it('가득 찬 페이지는 다음 offset으로 이어 읽고 전량을 합친다', async () => {
    const total = SUPABASE_PAGE_SIZE + 250;
    const { rows, error } = await fetchAllRows<number>(async (from, to) => {
      const slice = makeRows(total).slice(from, to + 1);
      return { data: slice, error: null };
    });

    expect(rows).toHaveLength(total);
    expect(rows[0]).toBe(0);
    expect(rows[total - 1]).toBe(total - 1);
    expect(error).toBeNull();
  });

  it('전체 행 수가 페이지 크기의 배수면 빈 페이지에서 멈춘다', async () => {
    const total = SUPABASE_PAGE_SIZE;
    const calls: Array<[number, number]> = [];
    const { rows } = await fetchAllRows<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: makeRows(total).slice(from, to + 1), error: null };
    });

    expect(rows).toHaveLength(total);
    expect(calls).toHaveLength(2);
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
