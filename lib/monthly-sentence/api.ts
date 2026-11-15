import { NextResponse } from 'next/server';
import { excerptHeaders } from '@/lib/monthly-excerpt/errors';

/** 달마다 한 문장 API의 응답 헤더 — 사람마다 다른 응답이라 어디에도 저장하지 않는다. */
export const sentenceHeaders = excerptHeaders;

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400, headers: sentenceHeaders });
}

/** RPC가 던지는 예외 이름 → 독자에게 보일 문구. 여기 없는 오류는 내부 사정이라 문구를 돌려주지 않는다. */
const MESSAGES: Record<string, string> = {
  invalid_month: '달을 확인해 주세요.',
  invalid_entry: '고를 수 없는 기록이에요.',
  invalid_rule: '기준을 확인해 주세요.',
};

/** 알려진 예외는 400으로, 나머지는 fallback 문구와 500으로. 로그에는 오류 코드만 남긴다. */
export function rpcFailure(error: { message?: string; code?: string }, fallback: string) {
  const known = MESSAGES[error.message ?? ''];
  if (known) return badRequest(known);
  console.error('Monthly sentence API failed:', error.code);
  return NextResponse.json({ error: fallback }, { status: 500, headers: sentenceHeaders });
}

/** 요청 본문을 객체로 읽는다. JSON이 아니거나 객체가 아니면 null. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
