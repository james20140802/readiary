import { createSupabaseClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { badgeConditions } from './badgeConditions';
import { BadgeCheckData } from '@/types/badges';

type Badge = Database['public']['Tables']['badges']['Row'];

export async function getBadgeCheckData(userId: string): Promise<BadgeCheckData> {
  const supabase = createSupabaseClient();

  // 1. 유저의 책 정보 가져오기 (완독 수 포함)
  const { data: userBooks } = await supabase
    .from('user_books')
    .select('id, is_finished')
    .eq('user_id', userId);

  const userBookIds = userBooks?.map((b) => b.id) ?? [];
  const finishedBookCount = userBooks?.filter((b) => b.is_finished).length ?? 0;

  if (userBookIds.length === 0) {
    return { totalEntries: 0, finishedBookCount: 0, totalPagesRead: 0, entryDates: [] };
  }

  // 2. 모든 기록 한 번에 가져오기
  const { data: entries } = await supabase
    .from('entries')
    .select('from_page, to_page, date')
    .in('user_book_id', userBookIds);

  const totalEntries = entries?.length ?? 0;

  // 페이지 합산
  const totalPagesRead =
    entries?.reduce((sum, e) => {
      return sum + Math.max(0, (e.to_page ?? 0) - (e.from_page ?? 0) + 1);
    }, 0) ?? 0;

  // 날짜 집합 (중복 제거 및 정렬)
  const entryDates = Array.from(new Set(entries?.map((e) => e.date) ?? []));

  return { totalEntries, finishedBookCount, totalPagesRead, entryDates };
}

export async function checkAndAwardBadges(userId: string): Promise<Badge[]> {
  const supabase = createSupabaseClient();

  const { data: allBadges, error: badgeError } = await supabase.from('badges').select('*');

  if (badgeError || !allBadges) {
    console.error('Failed to load badges:', badgeError);
    return [];
  }

  const { data: userBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const ownedBadgeIds = userBadges?.map((b) => b.badge_id) ?? [];

  const newlyEarnedBadges: Badge[] = [];

  for (const badge of allBadges) {
    const alreadyOwned = ownedBadgeIds.includes(badge.id);
    if (alreadyOwned) continue;

    const condition = badgeConditions.find((c) => c.code === badge.code);
    if (!condition) continue;

    const badgeCheckData = await getBadgeCheckData(userId);

    const conditionMet = condition.check(badgeCheckData);
    if (conditionMet) {
      const { error: insertError } = await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badge.id,
        awarded_at: new Date().toISOString(),
      });

      if (!insertError) {
        newlyEarnedBadges.push(badge);
      } else {
        console.warn('Failed to award badge:', insertError.message);
      }
    }
  }

  return newlyEarnedBadges;
}
