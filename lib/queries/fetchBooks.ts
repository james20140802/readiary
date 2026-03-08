import { MyBook } from '@/types/book';
import { createSupabaseServerClient } from '../supabase/server';

export async function fetchMyBooksData(): Promise<MyBook[] | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const { data, error } = await supabase
    .from('user_books')
    .select('id, progress, book_id, created_at, last_read_page, is_finished, books(*)')
    .eq('user_id', user.id);

  if (!data || error) return [];

  return data;
}
