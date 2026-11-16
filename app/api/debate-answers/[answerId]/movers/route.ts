import { pathId, rpcResponse, withSession } from '@/lib/debate/server';

interface Context {
  params: Promise<{ answerId: string }>;
}

// GET: 내 답에 생각이 바뀌었다고 누른 사람들(답 쓴 사람만).
export async function GET(_request: Request, { params }: Context) {
  const id = pathId((await params).answerId, '답');
  if (id instanceof Response) return id;
  return withSession((supabase) =>
    rpcResponse(supabase, 'get_debate_movers', { p_answer_id: id }, '불러오지 못했어요.')
  );
}
