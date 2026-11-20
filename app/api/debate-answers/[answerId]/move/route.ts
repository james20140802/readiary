import { badRequest } from '@/lib/debate/errors';
import { pathId, readBody, rpcResponse, withSession } from '@/lib/debate/server';
import { notifyDebateEvent, retractDebateNotification } from '@/lib/notifications/notify';

interface Context {
  params: Promise<{ answerId: string }>;
}

// PUT: 생각이 바뀌었어요 켜고 끄기 { on }. 그 답의 새 수를 돌려준다.
export async function PUT(request: Request, { params }: Context) {
  const id = pathId((await params).answerId, '답');
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body || typeof body.on !== 'boolean') return badRequest('요청을 확인해 주세요.');
    return rpcResponse(
      supabase,
      'set_debate_move',
      { p_answer_id: id, p_on: body.on },
      '반영하지 못했어요.',
      (data) => ({ movedCount: data }),
      200,
      // 켜면 답 쓴 사람에게 알리고(답마다 하루 한 번), 곧바로 끄면 안 읽은 알림을 거둔다
      () =>
        body.on
          ? notifyDebateEvent(supabase, 'debate_move', id)
          : retractDebateNotification(supabase, 'debate_move', id)
    );
  });
}
