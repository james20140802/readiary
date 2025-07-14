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

    const earned = await evaluateCondition(badge.code, userId, supabase);
    if (earned) {
      const { error: insertError } = await supabase
        .from('user_badges')
        .insert({ user_id: userId, badge_id: badge.id });

      if (!insertError) {
        newlyEarnedBadges.push(badge);
      }
    }
  }

  return newlyEarnedBadges;
}

async function evaluateCondition(
  conditionKey: string,
  userId: string,
  supabase: ReturnType<typeof createSupabaseClient>
): Promise<boolean> {
  switch (conditionKey) {
    case 'first_entry': {
      const { count } = await supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return (count ?? 0) >= 1;
    }

    case 'finish_one_book': {
      const { count } = await supabase
        .from('user_books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_finished', true);

      return (count ?? 0) >= 1;
    }

    default:
      return false;
  }
}
