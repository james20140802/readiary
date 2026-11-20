import { pathId, rpcResponse, withSession } from '@/lib/debate/server';

interface Context {
  params: Promise<{ entry_id: string }>;
}

// GET: 내 기록으로 연 토론 수 { count } — 기록 메뉴와 삭제 확인창이 쓴다.
export async function GET(_request: Request, { params }: Context) {
  const id = pathId((await params).entry_id, '기록');
  if (id instanceof Response) return id;
  return withSession((supabase) =>
    rpcResponse(
      supabase,
      'count_entry_debates',
      { p_entry_id: id },
      '불러오지 못했어요.',
      (data) => ({
        count: data ?? 0,
      })
    )
  );
}
