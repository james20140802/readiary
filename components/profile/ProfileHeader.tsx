'use client';

import { toast } from 'sonner';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import { Profile } from '@/types/profile';
import { redirect } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface ProfileHeaderProps {
  user: User;
  profile: Profile;
}

export default function ProfileHeader({ user, profile }: ProfileHeaderProps) {
  const isOwnProfile = user.id === profile.id;

  return (
    <section className="my-6">
      <Card hoverable={false}>
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
              {profile.nickname?.at(0)?.toUpperCase() ?? 'U'}
            </div>
          )}
          <div className="text-center">
            <p className="text-section-title font-semibold">{profile.name ?? '이름 없음'}</p>
            <p className="text-body-text text-secondary">{user.email}</p>
            <p className="text-body-text text-secondary mt-1">
              태그:{' '}
              <span className="font-mono">
                {profile.nickname}#{profile.tag ?? '0000'}
              </span>
            </p>
          </div>
        </div>
        {isOwnProfile && (
          <div className="text-center text-secondary">아직 계정 관리 기능은 준비 중입니다.</div>
        )}
        <div className="flex justify-end">
          {isOwnProfile ? (
            <Button
              variant="danger"
              className="mt-4"
              onClick={async () => {
                const supabase = await createSupabaseClient();
                await supabase.auth.signOut();
                redirect('/login');
              }}
            >
              로그아웃
            </Button>
          ) : (
            <Button
              variant="danger"
              className="mt-4"
              onClick={async () => {
                const res = await fetch('/api/friends/remove', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ friendId: profile.id }),
                });
                if (res.ok) {
                  toast.success('친구를 삭제했어요.');
                  redirect('/protected/social');
                } else {
                  toast.error('친구 삭제에 실패했습니다.');
                }
              }}
            >
              친구 삭제
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}
