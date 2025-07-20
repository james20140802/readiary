import { createSupabaseClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';
import { badgeConditions } from './badgeConditions';

type Badge = Database['public']['Tables']['badges']['Row'];

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

    const conditionMet = await condition.check(userId);
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
