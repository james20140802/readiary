'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

type Badge = Database['public']['Tables']['badges']['Row'];
type UserBadge = Database['public']['Tables']['user_badges']['Row'] & {
  badge: Badge;
};

export default function ProfileBadges() {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const isMobile = useIsMobile();
  const [tooltipIndex, setTooltipIndex] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadges = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        console.error('User not found or not authenticated');
        return;
      }
      const { data: userBadgeData, error } = await supabase
        .from('user_badges')
        .select('awarded_at, badge:badges!fk_user_badges_badge_id(id, name, description, icon_url)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to load badges:', error.message);
      } else if (userBadgeData) {
        setBadges(userBadgeData as UserBadge[]);
      }
    };

    fetchBadges();
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-4">획득한 배지</h2>
      <div className="grid grid-cols-3 gap-4">
        {badges.map(({ badge, awarded_at }) => (
          <div
            key={badge.id}
            className="text-center group relative"
            onClick={() => {
              if (isMobile) {
                setTooltipIndex((prev) => (prev === badge.id ? null : badge.id));
              }
            }}
            onMouseEnter={() => {
              if (!isMobile) setTooltipIndex(badge.id);
            }}
            onMouseLeave={() => {
              if (!isMobile) setTooltipIndex(null);
            }}
          >
            <Image
              src={badge.icon_url || '/images/default-badge.png'}
              alt={badge.name}
              width={80}
              height={80}
              className="mx-auto rounded-md"
            />
            <div className="mt-2 text-sm font-medium">{badge.name}</div>
            <div className="text-xs text-gray-500">
              {awarded_at && new Date(awarded_at).toLocaleDateString()}
            </div>
            {tooltipIndex === badge.id && (
              <div className="absolute left-1/2 -translate-x-1/2 bg-white text-black text-xs px-2 py-1 rounded shadow top-full mt-2 z-10 whitespace-nowrap">
                {badge.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
