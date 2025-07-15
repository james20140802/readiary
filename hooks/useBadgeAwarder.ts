'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { checkAndAwardBadges } from '@/utils/badges';

/**
 * 배지를 조건에 따라 체크하고 수여하며, 사용자에게 알려주는 훅
 */
export function useBadgeAwarder() {
  const awardBadges = useCallback(async (userId: string) => {
    const newBadges = await checkAndAwardBadges(userId);

    if (newBadges.length > 0) {
      const badgeNames = newBadges.map((b) => b.name).join(', ');
      toast.success(`🎉 ${newBadges.length}개의 배지를 획득했어요: ${badgeNames}`);
    }

    return newBadges;
  }, []);

  return awardBadges;
}
