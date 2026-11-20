import { badRequest } from '@/lib/debate/errors';
import {
  LIMITS,
  PAGE_SIZE,
  isText,
  parseUnderlines,
  readBody,
  rpcResponse,
  withSession,
} from '@/lib/debate/server';
import { isUuid } from '@/lib/share/validation';

// GET: 토론 목록 한 쪽. ?closed=1이면 정리된 토론, ?before=<ISO>는 앞 쪽 마지막 항목의 시각.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const closed = url.searchParams.get('closed') === '1';
  const before = url.searchParams.get('before');
  if (before !== null && Number.isNaN(Date.parse(before)))
    return badRequest('목록 위치를 확인해 주세요.');
  return withSession((supabase) =>
    rpcResponse(
      supabase,
      'list_debates',
      { p_closed: closed, p_before: before, p_limit: PAGE_SIZE },
      '토론 목록을 불러오지 못했어요.'
    )
  );
}

// POST: 발제. 내 기록의 문장을 고정하고 밑줄(0~3개)과 질문을 붙인다.
export async function POST(request: Request) {
  return withSession(async (supabase) => {
    const body = await readBody(request);
    if (!body) return badRequest('발제 내용을 확인해 주세요.');
    const { entryId, question } = body;
    if (typeof entryId !== 'string' || !isUuid(entryId)) return badRequest('기록을 골라 주세요.');
    if (!isText(question, LIMITS.question)) return badRequest('질문을 1~500자로 적어 주세요.');
    const underlines = parseUnderlines(body.underlines ?? []);
    if (!underlines) return badRequest('밑줄을 다시 확인해 주세요.');
    return rpcResponse(
      supabase,
      'create_debate',
      { p_entry_id: entryId.toLowerCase(), p_question: question, p_underlines: underlines },
      '토론을 열지 못했어요.',
      (data) => ({ id: data }),
      201
    );
  });
}
