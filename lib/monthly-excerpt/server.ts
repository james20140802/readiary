import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  Candidate,
  ExcerptMonthRow,
  ExcerptOwner,
  ExcerptPrompt,
  FriendMonthlyExcerpt,
  MonthBook,
  MonthKey,
  MonthlyExcerpt,
  MonthlyExcerptReactionCounts,
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

/**
 * 한 권의 첫 좋아요·댓글 수. 볼 수 없으면 null이다.
 * 곁다리라 실패해도 읽기를 막지 않도록 null로 삼킨다. 화면은 null이면 수를 그리지 않고 알린다.
 */
export async function fetchMonthlyExcerptReactions(
  excerptId: string
): Promise<MonthlyExcerptReactionCounts | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_excerpt_reactions', { p_id: excerptId });
  if (error) {
    console.error('Monthly excerpt reactions unavailable:', error.code);
    return null;
  }
  return (data as unknown as MonthlyExcerptReactionCounts | null) ?? null;
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

/** 한 쪽의 크기. /api/monthly-excerpts/candidates와 같다. */
const CANDIDATE_PAGE_SIZE = 30;

/**
 * 엮기 화면이 처음 그릴 후보 — `전체` 기준 첫 쪽. 더 있는지는 다음 쪽의 첫 줄을 엿봐서 안다
 * (RPC의 offset이 page * limit이라 limit+1로 부르면 쪽이 어긋난다). 불러오지 못하면 throw.
 */
export async function fetchFirstCandidates(
  month: MonthKey
): Promise<{ items: Candidate[]; hasMore: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_excerpt_candidates', {
    p_month: month,
    p_page: 0,
    p_limit: CANDIDATE_PAGE_SIZE,
  });
  if (error) fail('Monthly excerpt candidates unavailable', error);
  const items = (data ?? []) as unknown as Candidate[];
  let hasMore = false;
  if (items.length === CANDIDATE_PAGE_SIZE) {
    const peek = await supabase.rpc('get_monthly_excerpt_candidates', {
      p_month: month,
      p_page: CANDIDATE_PAGE_SIZE,
      p_limit: 1,
    });
    if (peek.error) fail('Monthly excerpt candidates unavailable', peek.error);
    hasMore = ((peek.data ?? []) as unknown[]).length > 0;
  }
  return { items, hasMore };
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

/** 주소의 닉네임과 태그로 찾은 주인. 없으면 null, 불러오지 못하면 throw. */
export async function fetchExcerptOwner(
  nickname: string,
  tag: string
): Promise<ExcerptOwner | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('nickname', nickname)
    .eq('tag', tag)
    .maybeSingle();
  if (error) fail('Monthly excerpt owner unavailable', error);
  return data ? { id: data.id, name: data.name ?? '' } : null;
}

/**
 * 친구가 읽는 한 권. 친구가 아니거나 볼 수 없으면 RPC가 null을 준다(이유를 구별하지 않는다).
 * 불러오지 못하면 throw.
 */
export async function fetchFriendMonthlyExcerpt(
  ownerId: string,
  month: MonthKey
): Promise<FriendMonthlyExcerpt | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_friend_monthly_excerpt', {
    p_owner: ownerId,
    p_month: month,
  });
  if (error) fail('Friend monthly excerpt unavailable', error);
  return (data as unknown as FriendMonthlyExcerpt | null) ?? null;
}

/** 친구의 해 목록(최신 해 먼저). 친구에게는 엮지 않은 달이 없다. 불러오지 못하면 throw. */
export async function fetchFriendExcerptYears(ownerId: string): Promise<YearRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_friend_monthly_excerpt_years', {
    p_owner: ownerId,
  });
  if (error) fail('Friend monthly excerpt years unavailable', error);
  return (data ?? []).map((row) => ({
    year: row.year,
    excerptCount: row.excerpt_count,
    hasUnmade: false,
  }));
}

/** 친구의 한 해(최신 달 먼저). 수와 표지는 친구에게 보이는 문장 기준이다. 불러오지 못하면 throw. */
export async function fetchFriendExcerptYear(
  ownerId: string,
  year: number
): Promise<ExcerptMonthRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_friend_monthly_excerpt_year', {
    p_owner: ownerId,
    p_year: year,
  });
  if (error) fail('Friend monthly excerpt year unavailable', error);
  const rows = (data ?? []) as unknown as Omit<ExcerptMonthRow, 'isShared'>[];
  // 친구에게 내려오는 달은 모두 공개 중이다. 응답에는 없지만 모아 보기와 같은 모양으로 맞춘다.
  return rows.map((row) => ({ ...row, isShared: true }));
}
