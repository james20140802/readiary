import { badRequest } from '@/lib/debate/errors';
import {
  LIMITS,
  PAGE_SIZE,
  isOptionalUuid,
  isStance,
  isText,
  pathId,
  readBody,
  rpcResponse,
  withSession,
} from '@/lib/debate/server';

interface Context {
  params: Promise<{ id: string }>;
}

const position = (v: unknown) => v === null || v === 1 || v === 2 || v === 3;

// GET: 단락의 답 한 쪽. ?position=1~3 또는 ?whole=1(문장 전체), ?after=건너뛸 개수.
export async function GET(request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  const url = new URL(request.url);
  const whole = url.searchParams.get('whole') === '1';
  const pos = whole ? null : Number(url.searchParams.get('position'));
  const after = Number(url.searchParams.get('after') ?? 0);
  if ((!whole && !position(pos)) || !Number.isInteger(after) || after < 0) {
    return badRequest('불러올 답을 확인해 주세요.');
  }
  return withSession((supabase) =>
    rpcResponse(
      supabase,
      'get_debate_answers',
      { p_id: id, p_position: pos, p_all_sentence: whole, p_after: after, p_limit: PAGE_SIZE },
      '답을 불러오지 못했어요.'
    )
  );
}

// POST: 답 남기기. underline은 밑줄 번호(없으면 문장 전체), 입장 필수, 근거 기록은 선택.
export async function POST(request: Request, { params }: Context) {
  const id = pathId((await params).id);
  if (id instanceof Response) return id;
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body) return badRequest('답을 확인해 주세요.');
    const underline = body.underline ?? null;
    if (!position(underline)) return badRequest('밑줄을 다시 확인해 주세요.');
    if (!isStance(body.stance)) return badRequest('공감, 다르게 읽음, 질문 중 하나를 골라 주세요.');
    if (!isText(body.body, LIMITS.body)) return badRequest('1~2000자로 적어 주세요.');
    if (!isOptionalUuid(body.evidenceEntryId)) return badRequest('붙일 기록을 확인해 주세요.');
    return rpcResponse(
      supabase,
      'add_debate_answer',
      {
        p_debate_id: id,
        p_underline: underline,
        p_stance: body.stance,
        p_body: body.body,
        p_evidence_entry_id: body.evidenceEntryId ?? null,
      },
      '답을 남기지 못했어요.',
      (data) => ({ id: data }),
      201
    );
  });
}
