import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { badRequest, excerptHeaders, rpcFailure } from '@/lib/monthly-excerpt/errors';
import { isMonthKey } from '@/lib/monthly-excerpt/month';
import type { MonthBook } from '@/lib/monthly-excerpt/types';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** 그달에 문장을 남긴 책(책 칩) — 엮기 화면이 칩만 다시 불러올 때 */
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const month = new URL(request.url).searchParams.get('month') ?? '';
  if (!isMonthKey(month)) return badRequest('달을 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_excerpt_month_books', {
    p_month: month,
  });
  if (error) return rpcFailure(error, '책 목록을 불러오지 못했어요.');
  const books: MonthBook[] = (data ?? []).map((row) => ({
    userBookId: row.user_book_id,
    title: row.title,
    quoteCount: row.quote_count,
  }));
  return NextResponse.json({ books }, { headers: excerptHeaders });
}
