import { NextResponse } from 'next/server';
import { NO_PUBLIC_QUOTES } from './model';

export const excerptHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };

export const EXCERPT_NOT_FOUND = '찾을 수 없는 발췌집이에요.';

/** RPC가 던지는 예외 이름 → 응답 문구. 여기 없는 오류는 내부 사정이라 문구를 돌려주지 않는다. */
const MESSAGES: Record<string, string> = {
  stale_entries: '고르는 사이 바뀐 기록이 있어요. 다시 불러올게요.',
  no_public_quotes: NO_PUBLIC_QUOTES,
  month_not_finished: '아직 끝나지 않은 달이에요.',
  no_entries: '문장을 하나 이상 골라 주세요.',
};

interface RpcError {
  message?: string;
  code?: string;
  details?: string | null;
}

/** DETAIL의 JSON 배열(문자열 id만). 읽지 못하면 빈 배열. */
function parseStaleIds(details: string | null | undefined): string[] {
  if (!details) return [];
  try {
    const parsed: unknown = JSON.parse(details);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400, headers: excerptHeaders });
}

/** 알려진 예외는 4xx로, 나머지는 메시지 없이 500으로. 로그에는 오류 코드만 남기고 기록 본문은 남기지 않는다. */
export function rpcFailure(error: RpcError, fallback: string) {
  const name = error.message ?? '';
  if (name === 'invalid_month') return badRequest('달을 확인해 주세요.');
  if (name === 'not_found') {
    return NextResponse.json(
      { error: EXCERPT_NOT_FOUND },
      { status: 404, headers: excerptHeaders }
    );
  }
  if (name in MESSAGES) {
    const body: { code: string; error: string; staleIds?: string[] } = {
      code: name,
      error: MESSAGES[name],
    };
    if (name === 'stale_entries') body.staleIds = parseStaleIds(error.details);
    return NextResponse.json(body, { status: 422, headers: excerptHeaders });
  }
  console.error('Monthly excerpt API failed:', error.code);
  return NextResponse.json({ error: fallback }, { status: 500, headers: excerptHeaders });
}
