import { calcStreak, calcWeekActivity, countWeekEntries, weekDatesKST } from '@/lib/dashboard/streak';
import { todayKST } from '@/lib/dates';
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

  const { data: books, error: booksError } = await supabase
    .from('user_books')
    .select('id, is_finished')
    .eq('user_id', user.id);

  if (booksError || !books) {
    console.error('Error fetching books:', booksError);
    return null;
  }

  const bookIds = books.map((book) => book.id);

  const todayKst = todayKST();
  const weekDates = weekDatesKST(todayKst);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  const [
    { data: myBooks },
    { data: entries },
    { data: weekEntries },
    { data: allEntryDates },
    { data: recentEntry },
  ] = await Promise.all([
      supabase
        .from('user_books')
        .select('id, progress, created_at, is_finished, last_read_page, book_id, books:books(*)')
        .eq('user_id', user.id)
        .eq('is_finished', false)
        .order('created_at', { ascending: false }),

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

      supabase
        .from('entries')
        .select('date')
        .in('user_book_id', bookIds)
        .gte('date', weekStart)
        .lte('date', weekEnd),

      supabase.from('entries').select('date').in('user_book_id', bookIds),

      supabase
        .from('entries')
        .select('user_book_id')
        .in('user_book_id', bookIds)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

  const recordedDatesSet = new Set((allEntryDates ?? []).map((entry) => entry.date));

  const streak = calcStreak(recordedDatesSet, todayKst);
  const weekActivity = calcWeekActivity(recordedDatesSet, todayKst);
  const weeklyCount = countWeekEntries(
    (weekEntries ?? []).map((entry) => entry.date),
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
