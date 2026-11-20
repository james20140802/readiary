import { badRequest } from '@/lib/debate/errors';
import { LIMITS, isText, pathId, readBody, rpcResponse, withSession } from '@/lib/debate/server';

interface Context {
  params: Promise<{ id: string }>;
}

// GET: 토론 한 편(문장·질문·정리·밑줄별 단락과 대표 답).
export async function GET(_request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  return withSession((supabase) =>
    rpcResponse(supabase, 'get_debate', { p_id: id }, '토론을 불러오지 못했어요.')
  );
}

// PATCH: 질문 고치기(발제자만). 밑줄은 올린 뒤 고칠 수 없다.
export async function PATCH(request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body || !isText(body.question, LIMITS.question))
      return badRequest('질문을 1~500자로 적어 주세요.');
    return rpcResponse(
      supabase,
      'update_debate_question',
      { p_id: id, p_question: body.question },
      '질문을 고치지 못했어요.'
    );
  });
}

// DELETE: 토론 지우기(발제자만). 답도 함께 사라진다.
export async function DELETE(_request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  return withSession((supabase) =>
    rpcResponse(supabase, 'delete_debate', { p_id: id }, '토론을 지우지 못했어요.')
  );
}
