import { badRequest } from '@/lib/debate/errors';
import {
  LIMITS,
  isStance,
  isText,
  pathId,
  readBody,
  rpcResponse,
  withSession,
} from '@/lib/debate/server';

interface Context {
  params: Promise<{ answerId: string }>;
}

// PATCH: 내 답·답글 고치기. 답은 입장이 필요하고 답글은 stance가 null이다. 정리된 토론에서는 고칠 수 없다.
export async function PATCH(request: Request, { params }: Context) {
  const id = pathId((await params).answerId, '답');
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body) return badRequest('답을 확인해 주세요.');
    const stance = body.stance ?? null;
    if (stance !== null && !isStance(stance))
      return badRequest('공감, 다르게 읽음, 질문 중 하나를 골라 주세요.');
    if (!isText(body.body, LIMITS.body)) return badRequest('1~2000자로 적어 주세요.');
    return rpcResponse(
      supabase,
      'edit_debate_answer',
      { p_id: id, p_stance: stance, p_body: body.body },
      '답을 고치지 못했어요.'
    );
  });
}

// DELETE: 내 답·답글 지우기. 답글이 달린 답은 자리만 남는다.
export async function DELETE(_request: Request, { params }: Context) {
  const id = pathId((await params).answerId, '답');
  if (id instanceof Response) return id;
  return withSession((supabase) =>
    rpcResponse(supabase, 'delete_debate_answer', { p_id: id }, '답을 지우지 못했어요.')
  );
}
