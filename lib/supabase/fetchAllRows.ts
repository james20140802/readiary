import type { PostgrestError } from '@supabase/supabase-js';

export const SUPABASE_PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: PostgrestError | null;
}

/**
 * PostgREST는 한 요청당 최대 행 수(기본 1,000)를 넘는 결과를 조용히 잘라낸다.
 * 전량이 필요한 집계·선택 쿼리는 이 헬퍼로 range 페이지네이션해 끝까지 읽는다.
 * buildPage가 만드는 쿼리에는 결정적 정렬(order)이 있어야 페이지 간 중복·누락이 없다.
 * 중간 페이지에서 오류가 나면 그때까지 읽은 rows와 함께 error를 돌려준다 — 처리 방식은 호출부가 정한다.
 */
export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ rows: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += SUPABASE_PAGE_SIZE) {
    const { data, error } = await buildPage(offset, offset + SUPABASE_PAGE_SIZE - 1);

    if (error) return { rows, error };
    if (!data || data.length === 0) return { rows, error: null };

    rows.push(...data);
    if (data.length < SUPABASE_PAGE_SIZE) return { rows, error: null };
  }
}
