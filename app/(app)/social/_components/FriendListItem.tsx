import Link from 'next/link';
import React from 'react';
import { ChevronRight } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { getImageUrl } from '@/utils/profile';

interface FriendListItemProps {
  profile: {
    id: string;
    name: string;
    nickname: string;
    tag: string;
    profile_image?: string | null;
  };
  action?: React.ReactNode;
  href?: string;
}

/** 조용한 리스트의 한 행 — 테두리 없이 괘선(divide-y)으로만 구분한다 */
export default function FriendListItem({ profile, action, href }: FriendListItemProps) {
  const profileInfo = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        src={getImageUrl(profile.profile_image || null) ?? undefined}
        alt={profile.nickname}
        fallbackText={profile.nickname[0].toUpperCase()}
        size="md"
      />
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-ink">{profile.name}</p>
        <p className="truncate text-caption text-ink-faint">
          {profile.nickname}#{profile.tag}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group flex items-center justify-between gap-3 py-3">
        {profileInfo}
        <ChevronRight
          size={16}
          className="shrink-0 text-ink-faint transition-colors group-hover:text-ink-sub"
        />
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      {profileInfo}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
