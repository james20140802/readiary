import { badRequest } from '@/lib/debate/errors';
import { LIMITS, isText, pathId, readBody, rpcResponse, withSession } from '@/lib/debate/server';

interface Context {
  params: Promise<{ answerId: string }>;
}

// GET: 답의 보이는 답글 전부.
export async function GET(_request: Request, { params }: Context) {
  const id = pathId((await params).answerId, '답');
  if (id instanceof Response) return id;
  return withSession((supabase) =>
    rpcResponse(supabase, 'get_debate_replies', { p_answer_id: id }, '답글을 불러오지 못했어요.')
  );
}

// POST: 답글 남기기(1단, 입장 없음).
export async function POST(request: Request, { params }: Context) {
  const id = pathId((await params).answerId, '답');
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body || !isText(body.body, LIMITS.body)) return badRequest('1~2000자로 적어 주세요.');
    return rpcResponse(
      supabase,
      'add_debate_reply',
      { p_answer_id: id, p_body: body.body },
      '답글을 남기지 못했어요.',
      (data) => ({ id: data }),
      201
    );
  });
}
