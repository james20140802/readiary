import { NextResponse } from 'next/server';

export const debateHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };

export const DEBATE_NOT_FOUND = '찾을 수 없는 토론이에요.';

/** RPC가 던지는 예외 이름 → [상태, 독자에게 보일 말]. 여기 없는 오류는 내부 사정이라 문구를 돌려주지 않는다. */
const KNOWN: Record<string, [number, string]> = {
  not_found: [404, DEBATE_NOT_FOUND],
  closed: [409, '정리된 토론이에요. 새 답은 남길 수 없어요.'],
  already_reported: [409, '이미 신고했어요.'],
  own_answer: [409, '내 답에는 누를 수 없어요.'],
  nested_reply: [422, '답글에는 답글을 달 수 없어요.'],
  no_quote: [422, '문장이 있는 기록만 토론을 열 수 있어요.'],
  invalid_question: [422, '질문을 1~500자로 적어 주세요.'],
  invalid_body: [422, '1~2000자로 적어 주세요.'],
  invalid_summary: [422, '정리를 1~2000자로 적어 주세요.'],
  invalid_stance: [422, '공감, 다르게 읽음, 질문 중 하나를 골라 주세요.'],
  invalid_underline: [422, '밑줄을 다시 확인해 주세요.'],
  invalid_underlines: [422, '밑줄을 다시 확인해 주세요.'],
  invalid_evidence: [422, '붙일 수 있는 기록이 아니에요.'],
  invalid_pins: [422, '짚을 답은 2개까지예요.'],
  invalid_reason: [422, '신고 사유를 확인해 주세요.'],
  account_pending_deletion: [403, '탈퇴를 신청한 계정은 남길 수 없어요.'],
};

interface RpcError {
  message?: string;
  code?: string;
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400, headers: debateHeaders });
}

/** 알려진 예외는 4xx로, 나머지는 메시지 없이 500으로. 로그에는 오류 코드만 남기고 본문은 남기지 않는다. */
export function rpcFailure(error: RpcError, fallback: string) {
  const name = error.message ?? '';
  const known = KNOWN[name];
  if (known) {
    return NextResponse.json(
      { code: name, error: known[1] },
      { status: known[0], headers: debateHeaders }
    );
  }
  console.error('Debate API failed:', error.code);
  return NextResponse.json({ error: fallback }, { status: 500, headers: debateHeaders });
}
