// 토론 API 라우트의 공통 손잡이: 세션 확인, 본문 읽기, RPC 호출과 오류 변환.
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { unauthorized } from '@/lib/api/auth';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Range, ReportReason, Stance } from './types';
import { MAX_PROMPT, MAX_UNDERLINES } from './underline';
import { badRequest, debateHeaders, rpcFailure } from './errors';

export const LIMITS = { question: 500, body: 2000, summary: 2000, memo: 500 } as const;
export const PAGE_SIZE = 10;

type Handler = (supabase: SupabaseClient, userId: string) => Promise<Response>;

/** 로그인한 사람만 handler를 부른다 */
export async function withSession(handler: Handler): Promise<Response> {
  const {
    data: { user },
    error,
  } = await getServerUser();
  if (error || !user) return unauthorized(debateHeaders);
  const supabase = (await createSupabaseServerClient()) as unknown as SupabaseClient;
  return handler(supabase, user.id);
}

/** RPC를 부르고 data를 map으로 바꿔 돌려준다 */
export async function rpcResponse(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
  fallback: string,
  map: (data: unknown) => unknown = (data) => data ?? { ok: true },
  status = 200
): Promise<Response> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return rpcFailure(error, fallback);
  return NextResponse.json(map(data), { status, headers: debateHeaders });
}

/** JSON 본문을 객체로. 깨졌거나 객체가 아니면 null */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const isStance = (v: unknown): v is Stance =>
  v === 'agree' || v === 'differ' || v === 'question';

export const isReason = (v: unknown): v is ReportReason =>
  v === 'abuse' || v === 'spam' || v === 'privacy' || v === 'other';

export const isText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && Array.from(v.trim()).length <= max;

export const isOptionalUuid = (v: unknown): v is string | null | undefined =>
  v === null || v === undefined || (typeof v === 'string' && isUuid(v));

/** 밑줄 모양만 본다(문장 안인지는 서버 RPC가 본다): 0~3개, 정수, 시작≤끝, 겹침 없음, 물음은 100자까지 */
export function parseUnderlines(v: unknown): Range[] | null {
  if (!Array.isArray(v) || v.length > MAX_UNDERLINES) return null;
  const out: Range[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') return null;
    const { start, end, prompt } = item as Record<string, unknown>;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
    if ((start as number) < 0 || (end as number) < (start as number)) return null;
    if (prompt !== undefined && prompt !== null && typeof prompt !== 'string') return null;
    const trimmed = typeof prompt === 'string' ? prompt.trim() : '';
    if (Array.from(trimmed).length > MAX_PROMPT) return null;
    out.push(
      trimmed
        ? { start: start as number, end: end as number, prompt: trimmed }
        : { start: start as number, end: end as number }
    );
  }
  const sorted = [...out].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start <= sorted[i - 1].end) return null;
  return out;
}

/** 경로의 uuid. 잘못됐으면 400 응답 */
export function pathId(value: string, label = '토론'): string | Response {
  return isUuid(value) ? value.toLowerCase() : badRequest(`${label}을 확인해 주세요.`);
}
