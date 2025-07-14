import { BadgeCheckResult } from '@/types/badges';
import { createSupabaseClient } from '../supabase';

const supabase = createSupabaseClient();

export async function checkFirstEntryBadge(userId: string): Promise<BadgeCheckResult> {
  const { data, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  return {
    badgeId: 'first_entry', // must match badges table id
    conditionMet: !error && (data?.length ?? 0) > 0,
  };
}

export async function checkFinishedBookBadge(userId: string): Promise<BadgeCheckResult> {
  const { data, error } = await supabase
    .from('user_books')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_finished', true);

  return {
    badgeId: 'first_finished_book',
    conditionMet: !error && (data?.length ?? 0) > 0,
  };
}

export const badgeConditions = [checkFirstEntryBadge, checkFinishedBookBadge];
