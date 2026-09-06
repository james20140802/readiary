import { todayKST } from '@/lib/dates';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MyBook } from '@/types/book';
import type { RecentEntry } from './fetchRecentEntries';

export interface DashboardData {
  name: string | null;
  books: MyBook[];
  weekActivity: boolean[];
  weeklyCount: number;
  todayKst: string;
  recentUserBookId: string | null;
  recentEntries: RecentEntry[];
  latestTexts: Record<string, string>;
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_dashboard_core', { p_today: todayKST() });
  // Core content must not silently turn a database failure into an empty dashboard.
  if (error || !data)
    throw new Error('대시보드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return data as unknown as DashboardData;
}
