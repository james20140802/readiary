import { badRequest } from '@/lib/debate/errors';
import { pathId, readBody, rpcResponse, withSession } from '@/lib/debate/server';

interface Context {
  params: Promise<{ answerId: string }>;
}

// PUT: 발제자가 답·답글을 숨기거나 되돌린다 { hidden }.
export async function PUT(request: Request, { params }: Context) {
  const id = pathId((await params).answerId, '답');
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body || typeof body.hidden !== 'boolean') return badRequest('요청을 확인해 주세요.');
    return rpcResponse(
      supabase,
      'set_debate_answer_hidden',
      { p_answer_id: id, p_hidden: body.hidden },
      '반영하지 못했어요.'
    );
  });
}
