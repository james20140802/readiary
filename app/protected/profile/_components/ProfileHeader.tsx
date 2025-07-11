'use client';

import type { User } from '@supabase/supabase-js';
import { Profile } from '@/types/profile';

interface ProfileHeaderProps {
  user: User;
  profile: Profile;
}

export default function ProfileHeader({ user, profile }: ProfileHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow space-y-6 border border-gray-300 dark:border-gray-700">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-3xl text-white font-bold">
          {profile.nickname?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold">{profile.name ?? '이름 없음'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            태그:{' '}
            <span className="font-mono">
              {profile.nickname}#{profile.tag ?? '0000'}
            </span>
          </p>
        </div>
      </div>
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        아직 계정 관리 기능은 준비 중입니다.
      </div>
    </div>
  );
}
