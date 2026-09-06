import { todayKST } from '@/lib/dates';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MonthlySummary } from './monthlySummary';
import type { ProfileFetchOptions } from './fetchFeaturedQuote';
export { summarizeByMonth } from './monthlySummary';
export type { MonthlySummary };

/** 발췌집 한 권 — 완독했고 옮겨 적은 문장이 하나라도 있는 책 */
export interface FinishedBookExcerpt {
  bookId: string;
  title: string;
  coverUrl: string | null;
  quoteCount: number;
}

export interface RetrospectData {
  finishedBooks: FinishedBookExcerpt[];
  monthly: MonthlySummary[];
}

/** Bounded month previews and DB-side counts; caller RLS always applies. */
export async function fetchRetrospectData(
  userId: string,
  { publicOnly = false }: ProfileFetchOptions = {}
): Promise<RetrospectData | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_profile_retrospect', {
    p_user_id: userId,
    p_today: todayKST(),
    p_public_only: publicOnly,
  });
  if (error) {
    console.error('Profile retrospect unavailable:', error.code);
    return null;
  }
  return data as unknown as RetrospectData | null;
}
