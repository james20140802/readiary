import { checkFinishedBookBadge, checkFirstEntryBadge } from '@/lib/badges/condition';
import { createSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';

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

    const earned = await evaluateCondition(badge.code, userId);

    if (earned) {
      const { error: insertError } = await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badge.id,
        awarded_at: new Date().toISOString(),
      });

      if (!insertError) {
        newlyEarnedBadges.push(badge);
      } else {
        console.warn('Please ensure the user_badges table has an "awarded_at" timestamp column.');
      }
    }
  }

  return newlyEarnedBadges;
}

async function evaluateCondition(conditionKey: string, userId: string): Promise<boolean> {
  switch (conditionKey) {
    case 'first_entry': {
      return (await checkFirstEntryBadge(userId)).conditionMet;
    }

    case 'first_finished_book': {
      return (await checkFinishedBookBadge(userId)).conditionMet;
    }

    default:
      return false;
  }
}
