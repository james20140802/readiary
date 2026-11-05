import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { badRequest, excerptHeaders, rpcFailure } from '@/lib/monthly-excerpt/errors';
import { isMonthKey } from '@/lib/monthly-excerpt/month';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ExcerptMonthRow } from '@/lib/monthly-excerpt/types';

/** 제품 상한이 아니라 요청 크기를 묶는 안전선이다(설계 문서 1. 고르기). */
const MAX_ENTRIES = 500;

/** 엮기·다시 엮기. 고른 순서가 곧 순서 번호다. */
export async function POST(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const body = (await request.json().catch(() => null)) as {
    month?: unknown;
    entryIds?: unknown;
    isShared?: unknown;
  } | null;
  if (typeof body?.month !== 'string' || !isMonthKey(body.month)) {
    return badRequest('달을 확인해 주세요.');
  }
  const { entryIds } = body;
  if (Array.isArray(entryIds) && entryIds.length > MAX_ENTRIES) {
    return badRequest(`한 번에 고를 수 있는 문장은 ${MAX_ENTRIES}개까지예요.`);
  }
  if (
    !Array.isArray(entryIds) ||
    !entryIds.every((id): id is string => typeof id === 'string' && isUuid(id))
  ) {
    return badRequest('고른 문장을 확인해 주세요.');
  }
  if (typeof body.isShared !== 'boolean') return badRequest('공개 범위를 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('save_monthly_excerpt', {
    p_month: body.month,
    p_entry_ids: entryIds,
    p_is_shared: body.isShared,
  });
  if (error) return rpcFailure(error, '발췌집을 엮지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  return NextResponse.json({ id: data }, { headers: excerptHeaders });
}

/** 한 해의 달들 — 접힌 해를 펼칠 때 */
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const raw = new URL(request.url).searchParams.get('year') ?? '';
  const year = /^\d{4}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(year) || year < 1900 || year > 9999)
    return badRequest('해를 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_my_monthly_excerpt_year', { p_year: year });
  if (error) return rpcFailure(error, '달의 발췌집을 불러오지 못했어요.');
  return NextResponse.json(
    { months: (data ?? []) as unknown as ExcerptMonthRow[] },
    { headers: excerptHeaders }
  );
}
