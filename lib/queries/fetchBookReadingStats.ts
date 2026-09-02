import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';

/** user_book 하나의 읽기 통계 — 펼친 책의 오른쪽 면에 쓴다 */
export interface BookReadingStat {
  /** 첫 기록 날짜(YYYY-MM-DD) */
  firstDate: string;
  /** 마지막 기록 날짜(YYYY-MM-DD) */
  lastDate: string;
  entryCount: number;
}

interface Row {
  user_book_id: string;
  date: string;
}

/**
 * 본인 책 전부의 기록 날짜를 한 번에 읽어 user_book별 첫·마지막 날짜와 개수로 접는다.
 * 실패하면 빈 맵 — 통계는 장식이라 목록 자체를 막지 않는다.
 */
export async function fetchBookReadingStats(): Promise<Record<string, BookReadingStat>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (!user || userError) return {};

  const { rows, error } = await fetchAllRows<Row>((from, to) =>
    supabase
      .from('entries')
      .select('user_book_id, date, user_books!inner(user_id)')
      .eq('user_books.user_id', user.id)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );
  if (error) return {};

  const stats: Record<string, BookReadingStat> = {};
  for (const row of rows) {
    const date = row.date.slice(0, 10);
    const s = stats[row.user_book_id];
    if (!s) {
      stats[row.user_book_id] = { firstDate: date, lastDate: date, entryCount: 1 };
    } else {
      if (date < s.firstDate) s.firstDate = date;
      if (date > s.lastDate) s.lastDate = date;
      s.entryCount += 1;
    }
  }
  return stats;
}
