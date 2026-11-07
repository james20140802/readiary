import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { badRequest, excerptHeaders, rpcFailure } from '@/lib/monthly-excerpt/errors';
import { parseYear } from '@/lib/monthly-excerpt/month';
import type { ExcerptMonthRow } from '@/lib/monthly-excerpt/types';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * 친구의 한 해 — 접힌 해를 펼칠 때. 볼 수 있는지는 RPC가 auth.uid()로 정하고, 친구가 아니면 빈 목록이다.
 * 공개를 거둔 뒤 남지 않도록 응답을 어디에도 캐시하지 않는다(excerptHeaders).
 */
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const params = new URL(request.url).searchParams;
  const owner = params.get('owner') ?? '';
  const year = parseYear(params.get('year'));
  if (!isUuid(owner) || year === null) return badRequest('해를 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_friend_monthly_excerpt_year', {
    p_owner: owner,
    p_year: year,
  });
  if (error) return rpcFailure(error, '달의 발췌집을 불러오지 못했어요.');
  const rows = (data ?? []) as unknown as Omit<ExcerptMonthRow, 'isShared'>[];
  const months: ExcerptMonthRow[] = rows.map((row) => ({ ...row, isShared: true }));
  return NextResponse.json({ months }, { headers: excerptHeaders });
}
