import { createSupabaseClient } from '@/lib/supabase';
import { BadgeConditionDefinition } from '@/types/badges';

const supabase = createSupabaseClient();

async function hasFirstEntry(userId: string): Promise<boolean> {
  const { data: userBookIds, error: userBookError } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', userId);

  if (userBookError || !userBookIds) return false;

  const ids = userBookIds.map((ub) => ub.id);
  const { data, error } = await supabase.from('entries').select('id').in('user_book_id', ids);

  return !error && (data?.length ?? 0) > 0;
}

async function hasFinishedBook(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', userId)
    .eq('is_finished', true);

  return !error && (data?.length ?? 0) > 0;
}

export const badgeConditions: BadgeConditionDefinition[] = [
  {
    code: 'first_entry',
    description: '첫 독서 기록을 작성함',
    check: hasFirstEntry,
  },
  {
    code: 'first_finished_book',
    description: '처음으로 책 한 권을 완독함',
    check: hasFinishedBook,
  },
];
