import { BadgeCheckResult } from '@/types/badges';
import { createSupabaseClient } from '../supabase';

const supabase = createSupabaseClient();

export async function checkFirstEntryBadge(userId: string): Promise<BadgeCheckResult> {
  const { data: userBookIds, error: userBookError } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', userId);

  if (userBookError || !userBookIds) {
    return {
      badgeId: 'first_entry',
      conditionMet: false,
    };
  }

  const ids = userBookIds.map((ub) => ub.id);

  const { data, error } = await supabase.from('entries').select('id').in('user_book_id', ids);

  return {
    badgeId: 'first_entry', // must match badges table id
    conditionMet: !error && (data?.length ?? 0) > 0,
  };
}

export async function checkFinishedBookBadge(userId: string): Promise<BadgeCheckResult> {
  const { data, error } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', userId)
    .eq('is_finished', true);

  return {
    badgeId: 'first_finished_book',
    conditionMet: !error && (data?.length ?? 0) > 0,
  };
}

export const badgeConditions = [checkFirstEntryBadge, checkFinishedBookBadge];
