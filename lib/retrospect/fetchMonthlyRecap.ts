import { todayKST } from '@/lib/dates';
import { hasEntryContent } from '@/lib/entries/validation';
import { isMonthlyRecapDay, prevMonthRange, type MonthlyRecap } from '@/lib/retrospect/monthlyRecap';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type { MonthlyRecap };

/**
 * 매월 1일 홈 상단 지난달 회고 카드용 집계 — 실패·미로그인·1일이 아님·지난달 기록 0건은 전부 null.
 * 본인 데이터 전용(비공개 포함) — RLS 하 로그인 사용자 소유 entries만 조회.
 */
export async function fetchMonthlyRecap(): Promise<MonthlyRecap | null> {
  const todayKst = todayKST();
  if (!isMonthlyRecapDay(todayKst)) return null;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const { data: userBooks, error: userBooksError } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', user.id);

  if (userBooksError || !userBooks || userBooks.length === 0) return null;

  const bookIds = userBooks.map((b) => b.id);
  const { start, end, label } = prevMonthRange(todayKst);

  // 집계는 지난달 기록 전량이 필요 — 절단되면 수치가 조용히 줄어든다. 페이지네이션으로 끝까지 읽는다.
  const { rows: entries, error: entriesError } = await fetchAllRows<{
    id: string;
    quote: string | null;
    user_book_id: string;
  }>((from, to) =>
    supabase
      .from('entries')
      .select('id, quote, user_book_id')
      .in('user_book_id', bookIds)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, to)
  );

  if (entriesError || entries.length === 0) return null;

  const entryCount = entries.length;
  const quoteCount = entries.filter((e) => hasEntryContent(e.quote, null)).length;
  const bookCount = new Set(entries.map((e) => e.user_book_id)).size;

  return { label, entryCount, quoteCount, bookCount };
}
