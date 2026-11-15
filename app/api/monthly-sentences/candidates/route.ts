import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { isMonthKey } from '@/lib/monthly-excerpt/month';
import { badRequest, rpcFailure, sentenceHeaders } from '@/lib/monthly-sentence/api';
import type { SentenceCandidates } from '@/lib/monthly-sentence/types';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PAGE_SIZE = 30;

/** 문장 고르기 후보 — 그 달의 내 문장을 최근 것부터 30개씩. 나만 보기 문장도 표시와 함께 내려간다. */
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(sentenceHeaders);

  const params = new URL(request.url).searchParams;
  const month = params.get('month') ?? '';
  const rawOffset = params.get('offset');
  if (!isMonthKey(month)) return badRequest('달을 확인해 주세요.');
  if (rawOffset !== null && !/^\d{1,6}$/.test(rawOffset)) {
    return badRequest('불러올 위치를 확인해 주세요.');
  }
  const offset = rawOffset === null ? 0 : Number(rawOffset);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_sentence_candidates', {
    p_month: month,
    p_offset: offset,
    p_limit: PAGE_SIZE,
  });
  if (error) return rpcFailure(error, '문장을 불러오지 못했어요.');

  const page = data as unknown as SentenceCandidates;
  return NextResponse.json(
    { ...page, hasMore: offset + page.items.length < page.total },
    { headers: sentenceHeaders }
  );
}
