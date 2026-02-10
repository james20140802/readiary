import Link from 'next/link';
import React from 'react';

import Card from '@/components/ui/Card';
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

export default function FriendListItem({ profile, action, href }: FriendListItemProps) {
  const profileInfo = (
    <div className="flex items-center gap-4">
      <Avatar
        src={getImageUrl(profile.profile_image || null) ?? undefined}
        alt={profile.nickname}
        fallbackText={profile.nickname[0].toUpperCase()}
        size="md"
      />
      <div className="text-sm">
        <div className="font-medium text-gray-900 dark:text-white">{profile.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {profile.nickname}#{profile.tag}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="flex items-center justify-between p-4">
      {href ? (
        <Link href={href} className="flex items-center justify-between w-full">
          {profileInfo}
          {action && <div className="ml-auto">{action}</div>}
        </Link>
      ) : (
        <>
          {profileInfo}
          {action && <div className="ml-auto">{action}</div>}
        </>
      )}
    </Card>
  );
}
