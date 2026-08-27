import { calcStreak, calcWeekActivity, countWeekEntries, weekDatesKST } from '@/lib/dashboard/streak';
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

  // 책 목록도 행 캡을 넘을 수 있어 페이지네이션 — 여기서 잘리면 bookIds 기반 조회 전부가 불완전해진다.
  const { rows: books, error: booksError } = await fetchAllRows<{
    id: string;
    is_finished: boolean | null;
  }>((from, to) =>
    supabase
      .from('user_books')
      .select('id, is_finished')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .range(from, to)
  );

  if (booksError) {
    console.error('Error fetching books:', booksError);
    return null;
  }

  const bookIds = books.map((book) => book.id);

  const todayKst = todayKST();
  const weekDates = weekDatesKST(todayKst);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  const [
    { rows: myBooks },
    { data: entries },
    { rows: weekEntries },
    { rows: allEntryDates },
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

      supabase
        .from('entries')
        .select(
          `id, date, note, quote, from_page, to_page, is_private, created_at, user_books (
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
        .in('user_book_id', bookIds)
        .eq('date', todayKst)
        .order('created_at', { ascending: false })
        .limit(1),

      fetchAllRows<{ date: string }>((from, to) =>
        supabase
          .from('entries')
          .select('date')
          .in('user_book_id', bookIds)
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .order('date', { ascending: true })
          .order('created_at', { ascending: true })
          .range(from, to)
      ),

      // 스트릭용 전체 날짜 — 최신 날짜부터 페이지네이션해 절단 없이 읽는다(부분 실패 시에도 최근 날짜가 남는다).
      fetchAllRows<{ date: string }>((from, to) =>
        supabase
          .from('entries')
          .select('date')
          .in('user_book_id', bookIds)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to)
      ),

      supabase
        .from('entries')
        .select('user_book_id')
        .in('user_book_id', bookIds)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

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
