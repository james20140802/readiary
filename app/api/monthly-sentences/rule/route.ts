import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import {
  badRequest,
  readJsonObject,
  rpcFailure,
  sentenceHeaders,
} from '@/lib/monthly-sentence/api';
import { isSentenceRule } from '@/lib/monthly-sentence/model';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** 고르지 않은 달을 채우는 자동 기준을 바꾼다. */
export async function PUT(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(sentenceHeaders);

  const rule = (await readJsonObject(request))?.rule;
  if (!isSentenceRule(rule)) return badRequest('기준을 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_monthly_sentence_rule', { p_rule: rule });
  if (error) return rpcFailure(error, '기준을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.');
  return NextResponse.json({ rule }, { headers: sentenceHeaders });
}
