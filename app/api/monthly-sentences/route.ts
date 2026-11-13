import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { isMonthKey } from '@/lib/monthly-excerpt/month';
import {
  badRequest,
  readJsonObject,
  rpcFailure,
  sentenceHeaders,
} from '@/lib/monthly-sentence/api';
import { SENTENCE_PAGE_SIZE } from '@/lib/monthly-sentence/model';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * 일기장의 다음 줄 — `더 보기`. owner를 생략하면 내 일기장이다.
 * 누구의 것을 어디까지 볼 수 있는지는 RPC가 정한다: 본인·친구·그 밖(빈 결과).
 */
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(sentenceHeaders);

  const params = new URL(request.url).searchParams;
  const owner = params.get('owner');
  const before = params.get('before');
  if (owner !== null && !isUuid(owner)) return badRequest('누구의 일기장인지 확인해 주세요.');
  if (before !== null && !isMonthKey(before)) return badRequest('달을 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_sentences', {
    p_owner: owner ?? user.id,
    ...(before ? { p_before: before } : {}),
    p_limit: SENTENCE_PAGE_SIZE,
  });
  if (error) return rpcFailure(error, '문장을 불러오지 못했어요.');
  return NextResponse.json(data, { headers: sentenceHeaders });
}

/** 그 달의 문장을 고르거나(entryId) 자동으로 되돌린다(null). 바뀐 줄을 돌려준다. */
export async function PUT(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(sentenceHeaders);

  const body = await readJsonObject(request);
  const month = body?.month;
  const entryId = body?.entryId;
  if (typeof month !== 'string' || !isMonthKey(month)) return badRequest('달을 확인해 주세요.');
  if (entryId !== null && (typeof entryId !== 'string' || !isUuid(entryId))) {
    return badRequest('기록을 확인해 주세요.');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('set_monthly_sentence', {
    p_month: month,
    p_entry_id: entryId,
  });
  if (error) return rpcFailure(error, '문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.');
  return NextResponse.json({ row: data }, { headers: sentenceHeaders });
}
