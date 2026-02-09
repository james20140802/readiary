import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MyBook } from '@/types/book';
import { Entry } from '@/types/entry';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';

export async function fetchDashboardData(): Promise<{
  books: MyBook[] | null;
  entry: Entry | null;
  streak: number;
  weekActivity: boolean[];
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = startOfWeek(new Date(), { weekStartsOn: 0 });
  const end = addDays(start, 6);

  const [{ data: myBooks }, { data: entries }, { data: weekEntries }, { data: allEntryDates }] =
    await Promise.all([
      supabase
        .from('user_books')
        .select('id, progress, started_at, is_finished, last_read_page, book_id, books:books(*)')
        .eq('user_id', user.id)
        .eq('is_finished', false)
        .order('started_at', { ascending: false }),

      supabase
        .from('entries')
        .select(
          `id, date, summary, from_page, to_page, is_private, created_at, user_books (
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
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1),

      supabase
        .from('entries')
        .select('date')
        .in('user_book_id', bookIds)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd')),

      supabase.from('entries').select('date').in('user_book_id', bookIds),
    ]);

  const weekDays = [...Array(7)].map((_, i) => addDays(start, i));
  const weekActivity = weekDays.map((day) => {
    return weekEntries?.some((e) => isSameDay(parseISO(e.date), day)) ?? false;
  });

  const recordedDatesSet = new Set(
    (allEntryDates ?? []).map((entry) => format(parseISO(entry.date), 'yyyy-MM-dd'))
  );

  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const dateKey = format(cursor, 'yyyy-MM-dd');
    if (recordedDatesSet.has(dateKey)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    books: myBooks,
    entry:
      entries && entries.length > 0
        ? {
            id: entries[0].id,
            summary: entries[0].summary,
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
  };
}
