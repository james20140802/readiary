'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { fetchProfileData } from '@/lib/queries/fetchProfileData';
import type { User } from '@supabase/supabase-js';
import { Profile } from '@/types/profile';

import ProfileHeader from './_components/ProfileHeader';
import ProfileBookshelf from '@/components/profile/ProfileBookshelf';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileBadges from '@/components/profile/ProfileBadges';
import { UserBadge } from '@/types/badges';
import { UserBookWithCover } from '@/types/book';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userBooks, setUserBooks] = useState<UserBookWithCover[] | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUser(user);

      const { profile, userBooks, userBadges } = await fetchProfileData(user.id);

      setProfile(profile);
      setUserBooks(userBooks);
      setUserBadges(userBadges);
    };

    fetchUser();
  }, [router]);

  if (!user || !profile || !userBooks || !userBadges) {
    return <p className="text-center mt-10 text-gray-400">로딩 중...</p>;
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-6">
      <h1 className="text-center text-xl font-semibold mb-6">👤 내 프로필</h1>
      <div className="space-y-6">
        <ProfileHeader user={user} profile={profile} />
        <ProfileBookshelf userBooks={userBooks} />
        <ProfileStats userId={user.id} />
        <ProfileBadges userBadges={userBadges} />
      </div>
    </div>
  );
}
