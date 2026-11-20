import { badRequest } from '@/lib/debate/errors';
import {
  LIMITS,
  isOptionalUuid,
  isReason,
  pathId,
  readBody,
  rpcResponse,
  withSession,
} from '@/lib/debate/server';

interface Context {
  params: Promise<{ id: string }>;
}

// POST: 토론이나 그 안의 답·답글 신고. 운영자가 확인한다.
export async function POST(request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body || !isOptionalUuid(body.answerId) || !isReason(body.reason)) {
      return badRequest('신고 사유를 확인해 주세요.');
    }
    const memo = body.memo ?? null;
    if (
      memo !== null &&
      (typeof memo !== 'string' || Array.from(memo.trim()).length > LIMITS.memo)
    ) {
      return badRequest('메모는 500자까지예요.');
    }
    return rpcResponse(
      supabase,
      'report_debate',
      { p_debate_id: id, p_answer_id: body.answerId ?? null, p_reason: body.reason, p_memo: memo },
      '신고를 보내지 못했어요.'
    );
  });
}
