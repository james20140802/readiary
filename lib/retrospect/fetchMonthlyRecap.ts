import { todayKST } from '@/lib/dates';
import { isMonthlyRecapDay, type MonthlyRecap } from './monthlyRecap';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export type { MonthlyRecap };

export async function fetchMonthlyRecap(): Promise<MonthlyRecap | null> {
  const today = todayKST();
  if (!isMonthlyRecapDay(today)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_monthly_recap', { p_today: today });
  if (error) {
    console.error('Monthly recap unavailable:', error.code);
    return null;
  }
  return data as unknown as MonthlyRecap | null;
}
