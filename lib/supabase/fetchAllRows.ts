import type { PostgrestError } from '@supabase/supabase-js';

export const SUPABASE_PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: PostgrestError | null;
}

/**
 * PostgREST는 한 요청당 최대 행 수(서버 설정 max-rows, 기본 1,000)를 넘는 결과를 조용히 잘라낸다.
 * 전량이 필요한 집계·선택 쿼리는 이 헬퍼로 range 페이지네이션해 끝까지 읽는다.
 * buildPage가 만드는 쿼리에는 결정적 정렬(order)이 있어야 페이지 간 중복·누락이 없다.
 * 종료 판정은 빈 페이지로만 한다 — 요청 크기보다 짧은 응답을 EOF로 간주하면 서버 max-rows가
 * SUPABASE_PAGE_SIZE보다 작게 설정된 환경에서 첫 절단 페이지를 마지막 페이지로 오인한다.
 * offset은 실제 수신 행 수만큼 전진시키므로 서버 캡이 얼마든 연속으로 이어 읽는다.
 * 중간 페이지에서 오류가 나면 그때까지 읽은 rows와 함께 error를 돌려준다 — 처리 방식은 호출부가 정한다.
 */
export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ rows: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];

  for (let offset = 0; ; ) {
    const { data, error } = await buildPage(offset, offset + SUPABASE_PAGE_SIZE - 1);

    if (error) return { rows, error };
    if (!data || data.length === 0) return { rows, error: null };

    rows.push(...data);
    offset += data.length;
  }
}
