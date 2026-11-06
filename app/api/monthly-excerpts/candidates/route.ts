import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { badRequest, excerptHeaders, rpcFailure } from '@/lib/monthly-excerpt/errors';
import { isMonthKey } from '@/lib/monthly-excerpt/month';
import type { Candidate } from '@/lib/monthly-excerpt/types';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PAGE_SIZE = 30;
const MAX_PAGE = 100000;

/** 문장 고르기 후보 — 한 번에 30개. 비공개 문장도 isPrivate 표시와 함께 내려간다(내 화면). */
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const params = new URL(request.url).searchParams;
  const month = params.get('month') ?? '';
  const userBookId = params.get('userBookId');
  const rawPage = params.get('page');
  const page = rawPage === null ? 0 : /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : NaN;
  if (!isMonthKey(month)) return badRequest('달을 확인해 주세요.');
  if (userBookId !== null && !isUuid(userBookId)) return badRequest('책을 확인해 주세요.');
  if (!Number.isInteger(page) || page > MAX_PAGE) return badRequest('불러올 위치를 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const fail = '문장 후보를 불러오지 못했어요.';
  const { data, error } = await supabase.rpc('get_monthly_excerpt_candidates', {
    p_month: month,
    p_user_book_id: userBookId ?? undefined,
    p_page: page,
    p_limit: PAGE_SIZE,
  });
  if (error) return rpcFailure(error, fail);
  const items = (data ?? []) as unknown as Candidate[];

  // RPC의 offset은 page * limit이라 limit+1로 부르면 쪽이 어긋난다.
  // 한 쪽이 가득 찼을 때만 다음 쪽의 첫 줄을 엿봐서 더 있는지 판정한다.
  let hasMore = false;
  if (items.length === PAGE_SIZE) {
    const peek = await supabase.rpc('get_monthly_excerpt_candidates', {
      p_month: month,
      p_user_book_id: userBookId ?? undefined,
      p_page: (page + 1) * PAGE_SIZE,
      p_limit: 1,
    });
    if (peek.error) return rpcFailure(peek.error, fail);
    hasMore = ((peek.data ?? []) as unknown[]).length > 0;
  }
  return NextResponse.json({ items, hasMore }, { headers: excerptHeaders });
}
