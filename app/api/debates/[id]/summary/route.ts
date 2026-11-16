import { badRequest } from '@/lib/debate/errors';
import { LIMITS, isText, pathId, readBody, rpcResponse, withSession } from '@/lib/debate/server';
import { isUuid } from '@/lib/share/validation';

interface Context {
  params: Promise<{ id: string }>;
}

// PUT: 정리하기·정리 고치기(발제자만). 처음 정리하면 토론이 닫힌다. 짚는 답은 0~2개.
export async function PUT(request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body || !isText(body.body, LIMITS.summary))
      return badRequest('정리를 1~2000자로 적어 주세요.');
    const pins = body.pins ?? [];
    if (
      !Array.isArray(pins) ||
      pins.length > 2 ||
      !pins.every((p) => typeof p === 'string' && isUuid(p))
    ) {
      return badRequest('짚을 답은 2개까지예요.');
    }
    return rpcResponse(
      supabase,
      'set_debate_summary',
      { p_id: id, p_summary: body.body, p_answer_ids: pins },
      '정리를 남기지 못했어요.'
    );
  });
}

// DELETE: 정리를 지우고 다시 연다.
export async function DELETE(_request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  return withSession((supabase) =>
    rpcResponse(supabase, 'clear_debate_summary', { p_id: id }, '토론을 다시 열지 못했어요.')
  );
}
