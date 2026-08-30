import {
  calcStreak,
  calcWeekActivity,
  countWeekEntries,
  weekDatesKST,
} from '@/lib/dashboard/streak';
import { todayKST } from '@/lib/dates';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MyBook } from '@/types/book';
import { Entry } from '@/types/entry';

export async function fetchDashboardData(): Promise<{
  books: MyBook[] | null;
  entry: Entry | null;
  streak: number;
  weekActivity: boolean[];
  recentUserBookId: string | null;
  todayKst: string;
  weeklyCount: number;
} | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const todayKst = todayKST();
  const weekDates = weekDatesKST(todayKst);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  const [
    { rows: myBooks, error: myBooksError },
    { data: entries },
    { rows: weekEntries, error: weekEntriesError },
    { rows: allEntryDates, error: allEntryDatesError },
    { data: recentEntry },
  ] = await Promise.all([
    fetchAllRows<MyBook>((from, to) =>
      supabase
        .from('user_books')
        .select('id, progress, created_at, is_finished, last_read_page, book_id, books:books(*)')
        .eq('user_id', user.id)
        .eq('is_finished', false)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
    ),

    // 본인 책 필터는 ID 목록 .in() 대신 user_books 조인으로 — 책이 많아도 요청 URL 크기가 일정하다.
    supabase
      .from('entries')
      .select(
        `id, date, note, quote, from_page, to_page, is_private, created_at, user_books!inner (
                user_id,
                book_id,
                book:books (
                  id,
                  title,
                  author,
                  cover_url,
                  total_pages,
                  isbn
                )
              )`
      )
      .eq('user_books.user_id', user.id)
      .eq('date', todayKst)
      .order('created_at', { ascending: false })
      .limit(1),

    fetchAllRows<{ date: string }>((from, to) =>
      supabase
        .from('entries')
        .select('date, user_books!inner(user_id)')
        .eq('user_books.user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    ),

    // 스트릭용 전체 날짜 — 최신 날짜부터 페이지네이션해 절단 없이 읽는다.
    fetchAllRows<{ date: string }>((from, to) =>
      supabase
        .from('entries')
        .select('date, user_books!inner(user_id)')
        .eq('user_books.user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to)
    ),

    supabase
      .from('entries')
      .select('user_book_id, user_books!inner(user_id)')
      .eq('user_books.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  // 페이지네이션 조회의 오류는 폐기하지 않는다 — 부분 데이터로 빈 책장·틀린 스트릭을 그리는 대신 오류 경로로.
  if (myBooksError || weekEntriesError || allEntryDatesError) {
    console.error(
      'Error fetching dashboard data:',
      myBooksError ?? weekEntriesError ?? allEntryDatesError
    );
    return null;
  }

  const recordedDatesSet = new Set(allEntryDates.map((entry) => entry.date));
  const weekDatesSet = new Set(weekEntries.map((entry) => entry.date));

  const streak = calcStreak(recordedDatesSet, todayKst);
  // 주간 리듬은 주 범위로 한정된 weekEntries에서 계산 — weeklyCount와 같은 데이터를 보게 한다.
  const weekActivity = calcWeekActivity(weekDatesSet, todayKst);
  const weeklyCount = countWeekEntries(
    weekEntries.map((entry) => entry.date),
    todayKst
  );

  return {
    books: myBooks,
    entry:
      entries && entries.length > 0
        ? {
            id: entries[0].id,
            note: entries[0].note,
            quote: entries[0].quote,
            from_page: entries[0].from_page,
            to_page: entries[0].to_page,
            is_private: entries[0].is_private,
            date: entries[0].date,
            book: entries[0].user_books.book,
            created_at: entries[0].created_at || entries[0].date,
          }
        : null,
    streak,
    weekActivity,
    recentUserBookId: recentEntry?.[0]?.user_book_id ?? null,
    todayKst,
    weeklyCount,
  };
}
