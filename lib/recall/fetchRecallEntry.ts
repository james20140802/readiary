import { todayKST } from '@/lib/dates';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RecallEntry {
  id: string;
  date: string;
  quote: string;
  bookTitle: string;
  bookAuthor: string | null;
  yearsAgo: number | null;
}

/** DB selects one candidate with the same anniversary/seed rules as selectRecall. */
export async function fetchRecallEntry(): Promise<RecallEntry | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_recall_entry', { p_today: todayKST() });
  if (error) {
    console.error('Recall unavailable:', error.code);
    return null;
  }
  return data as unknown as RecallEntry | null;
}
