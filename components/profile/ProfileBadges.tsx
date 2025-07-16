'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { UserBadge } from '@/types/badges';

type ProfileBadgesProps = {
  userBadges: UserBadge[];
};

export default function ProfileBadges({ userBadges }: ProfileBadgesProps) {
  const isMobile = useIsMobile();
  const [tooltipIndex, setTooltipIndex] = useState<string | null>(null);

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-4">획득한 배지</h2>
      <div className="grid grid-cols-3 gap-4">
        {userBadges.map(({ badge, awarded_at }) => (
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
