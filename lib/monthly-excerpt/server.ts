import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  ExcerptMonthRow,
  ExcerptPrompt,
  MonthBook,
  MonthKey,
  MonthlyExcerpt,
  YearRow,
} from './types';

// 오류 처리: 기록이 없는 것(null·빈 목록)과 불러오지 못한 것(throw)을 구분한다.
// 호출하는 화면은 throw를 error.tsx나 자기 오류 상태로 받아 "없음"으로 오해하지 않는다.
// 로그에는 오류 코드만 남기고 기록 본문은 남기지 않는다.
function fail(label: string, error: { code?: string }): never {
  console.error(`${label}:`, error.code);
  throw new Error(label);
}

/** 그달에 엮은 발췌집. 아직 엮지 않았으면 null, 불러오지 못하면 throw. */
export async function fetchMyMonthlyExcerpt(month: MonthKey): Promise<MonthlyExcerpt | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_my_monthly_excerpt', { p_month: month });
  if (error) fail('Monthly excerpt unavailable', error);
  return (data as unknown as MonthlyExcerpt | null) ?? null;
}

/** 그달에 문장을 남긴 책(책 칩). 불러오지 못하면 throw. */
export async function fetchMonthBooks(month: MonthKey): Promise<MonthBook[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_excerpt_month_books', {
    p_month: month,
  });
  if (error) fail('Monthly excerpt books unavailable', error);
  return (data ?? []).map((row) => ({
    userBookId: row.user_book_id,
    title: row.title,
    quoteCount: row.quote_count,
  }));
}

/** 모아 보기의 해 목록(최신 해 먼저). 불러오지 못하면 throw. */
export async function fetchMyExcerptYears(): Promise<YearRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_my_monthly_excerpt_years');
  if (error) fail('Monthly excerpt years unavailable', error);
  return (data ?? []).map((row) => ({
    year: row.year,
    excerptCount: row.excerpt_count,
    hasUnmade: row.has_unmade,
  }));
}

/** 한 해의 달들(최신 달 먼저). 불러오지 못하면 throw. */
export async function fetchMyExcerptYear(year: number): Promise<ExcerptMonthRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_my_monthly_excerpt_year', { p_year: year });
  if (error) fail('Monthly excerpt year unavailable', error);
  return (data ?? []) as unknown as ExcerptMonthRow[];
}

/**
 * 오늘 화면의 "지난달을 엮어 볼까요" 안내. 곁다리 안내라 실패해도 오늘 화면을 막지 않도록
 * 실패는 null(안내 없음)로 삼킨다. fetchRetrospectData와 같은 방식이다.
 */
export async function fetchExcerptPrompt(todayKst: string): Promise<ExcerptPrompt | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_excerpt_prompt', { p_today: todayKst });
  if (error) {
    console.error('Monthly excerpt prompt unavailable:', error.code);
    return null;
  }
  return (data as unknown as ExcerptPrompt | null) ?? null;
}

/** 내가 엮은 달들(소유자 RLS). 달 목록 표시 용도. 불러오지 못하면 throw. */
export async function fetchMyExcerptMonths(): Promise<Set<MonthKey>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('monthly_excerpts').select('month');
  if (error) fail('Monthly excerpt months unavailable', error);
  // month는 date('YYYY-MM-01')라 앞 7자가 달 키다.
  return new Set((data ?? []).map((row) => row.month.slice(0, 7)));
}

/** 내가 엮은 발췌집 수(head count). 불러오지 못하면 throw. */
export async function fetchMyExcerptCount(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('monthly_excerpts')
    .select('id', { count: 'exact', head: true });
  if (error) fail('Monthly excerpt count unavailable', error);
  return count ?? 0;
}
