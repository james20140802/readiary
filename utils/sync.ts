import { createSupabaseClient } from '@/lib/supabase/client';

export async function updateProgress(bookId: string, userId: string) {
  const supabase = createSupabaseClient();
  const { error } = await supabase.rpc('update_user_book_progress', {
    p_book_id: bookId,
    p_user_id: userId,
  });

  if (error) {
    console.error('📛 진행도 업데이트 실패:', error.message);
    throw error;
  }
}
