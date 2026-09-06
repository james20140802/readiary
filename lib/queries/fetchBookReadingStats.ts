import { createSupabaseServerClient } from '@/lib/supabase/server';

/** user_book 하나의 읽기 통계 — 펼친 책의 오른쪽 면에 쓴다 */
export interface BookReadingStat {
  /** 첫 기록 날짜(YYYY-MM-DD) */
  firstDate: string;
  /** 마지막 기록 날짜(YYYY-MM-DD) */
  lastDate: string;
  entryCount: number;
}

export async function fetchBookReadingStats(): Promise<Record<string, BookReadingStat> | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_book_reading_stats');
  if (error) {
    console.error('Book stats unavailable:', error.code);
    return null;
  }
  return data as unknown as Record<string, BookReadingStat> | null;
}
