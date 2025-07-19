import Link from 'next/link';
import React from 'react';
import Image from 'next/image';

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
  return (
    <li
      key={profile.id}
      className="flex items-center justify-between p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700"
    >
      {href ? (
        <Link href={href} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {profile.profile_image ? (
              <Image
                src={profile.profile_image}
                alt="프로필 이미지"
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                {profile.nickname[0]}
              </div>
            )}
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white">{profile.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {profile.nickname}#{profile.tag}
              </div>
            </div>
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </Link>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {profile.profile_image ? (
              <Image
                src={profile.profile_image}
                alt="프로필 이미지"
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
                {profile.nickname[0]}
              </div>
            )}
            <div className="text-sm">
              <div className="font-medium text-gray-900 dark:text-white">{profile.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {profile.nickname}#{profile.tag}
              </div>
            </div>
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </>
      )}
    </li>
  );
}
