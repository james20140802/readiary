import { createSupabaseClient } from '@/lib/supabase/client';
import { BadgeConditionDefinition } from '@/types/badges';

const supabase = createSupabaseClient();

async function getUserBookIds(userId: string): Promise<string[]> {
  const { data: userBooks } = await supabase.from('user_books').select('id').eq('user_id', userId);
  return userBooks?.map((ub) => ub.id) ?? [];
}

async function getTotalPagesRead(userBookIds: string[]): Promise<number> {
  const { data: entries } = await supabase
    .from('entries')
    .select('from_page, to_page')
    .in('user_book_id', userBookIds);

  return (
    entries?.reduce((sum, e) => {
      const from = e.from_page ?? 0;
      const to = e.to_page ?? 0;
      return sum + Math.max(0, to - from);
    }, 0) ?? 0
  );
}

async function checkFirstEntry(userId: string): Promise<boolean> {
  const userBookIds = await getUserBookIds(userId);
  const { data, error } = await supabase
    .from('entries')
    .select('id')
    .in('user_book_id', userBookIds);
  return !error && (data?.length ?? 0) > 0;
}

async function checkFirstFinishedBook(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', userId)
    .eq('is_finished', true);

  return !error && (data?.length ?? 0) > 0;
}

async function checkEntryCount(userId: string, targetCount: number): Promise<boolean> {
  const userBookIds = await getUserBookIds(userId);
  if (userBookIds.length === 0) return false;
  const { count } = await supabase
    .from('entries')
    .select('*', { count: 'exact', head: true })
    .in('user_book_id', userBookIds);
  return (count ?? 0) >= targetCount;
}

async function checkFinishedBookCount(userId: string, targetCount: number): Promise<boolean> {
  const { count } = await supabase
    .from('user_books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_finished', true);
  return (count ?? 0) >= targetCount;
}

async function checkTotalPagesRead(userId: string, targetPages: number): Promise<boolean> {
  const userBookIds = await getUserBookIds(userId);
  if (userBookIds.length === 0) return false;
  const totalPages = await getTotalPagesRead(userBookIds);
  return totalPages >= targetPages;
}

async function checkStreak(userId: string, targetDays: number): Promise<boolean> {
  const userBookIds = await getUserBookIds(userId);
  if (userBookIds.length === 0) return false;

  const { data: entries } = await supabase
    .from('entries')
    .select('date')
    .in('user_book_id', userBookIds)
    .order('date', { ascending: false });

  if (!entries || entries.length < targetDays) return false;

  const dateSet = new Set(entries.map((e) => e.date));
  const today = new Date();

  for (let i = 0; i < targetDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (!dateSet.has(iso)) return false;
  }

  return true;
}

export const badgeConditions: BadgeConditionDefinition[] = [
  {
    code: 'first_entry',
    description: '첫 독서 기록을 작성함',
    check: checkFirstEntry,
  },
  {
    code: 'first_finished_book',
    description: '처음으로 책 한 권을 완독함',
    check: checkFirstFinishedBook,
  },
  {
    code: 'record_10',
    description: '독서 기록을 10개 작성함',
    check: (userId) => checkEntryCount(userId, 10),
  },
  {
    code: 'finish_3',
    description: '3권의 책을 완독함',
    check: (userId) => checkFinishedBookCount(userId, 3),
  },
  {
    code: 'page_100',
    description: '누적 100페이지 이상 읽음',
    check: (userId) => checkTotalPagesRead(userId, 100),
  },
  {
    code: 'streak_3',
    description: '3일 연속으로 독서 기록을 남김',
    check: (userId) => checkStreak(userId, 3),
  },
];
