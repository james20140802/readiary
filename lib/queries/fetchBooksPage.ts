import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MyBook } from '@/types/book';
import type { BookReadingStat } from './fetchBookReadingStats';

export async function fetchBooksPage(): Promise<{
  books: MyBook[];
  stats: Record<string, BookReadingStat>;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_books_page');
  if (error || !data) throw new Error('책장을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return data as unknown as { books: MyBook[]; stats: Record<string, BookReadingStat> };
}
