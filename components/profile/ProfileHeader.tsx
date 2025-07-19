'use client';

import { toast } from 'sonner';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import { Profile } from '@/types/profile';
import { redirect } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

interface ProfileHeaderProps {
  user: User;
  profile: Profile;
}

export default function ProfileHeader({ user, profile }: ProfileHeaderProps) {
  const isOwnProfile = user.id === profile.id;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow space-y-6 border border-gray-300 dark:border-gray-700">
      <div className="flex flex-col items-center space-y-3">
        {profile.profile_image ? (
          <Image
            src={profile.profile_image}
            alt="프로필 이미지"
            width={80}
            height={80}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-3xl text-white font-bold">
            {profile.nickname?.charAt(0).toUpperCase() ?? 'U'}
          </div>
        )}
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
      {isOwnProfile && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          아직 계정 관리 기능은 준비 중입니다.
        </div>
      )}
      <div className="flex justify-end">
        {isOwnProfile ? (
          <button
            onClick={async () => {
              const supabase = await createSupabaseClient();
              await supabase.auth.signOut();
              redirect('/login');
            }}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
          >
            로그아웃
          </button>
        ) : (
          <button
            onClick={async () => {
              const res = await fetch('/api/friends/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendUserId: profile.id }),
              });
              if (res.ok) {
                toast.success('친구를 삭제했어요.');
                redirect('/protected/social');
              } else {
                toast.error('친구 삭제에 실패했습니다.');
              }
            }}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded"
          >
            친구 삭제
          </button>
        )}
      </div>
    </div>
  );
}
