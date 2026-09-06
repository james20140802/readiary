import type { Stats } from '@/types/profile';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Aggregates only rows visible under the caller's RLS, including friend visibility. */
export async function getUserStats(userId: string): Promise<Stats | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_reading_stats', { p_user_id: userId });
  if (error) {
    console.error('Reading stats unavailable:', error.code);
    return null;
  }
  return data as unknown as Stats | null;
}
