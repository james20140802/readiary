'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Profile } from '@/types/profile';

import ProfileBookshelf from './_components/ProfileBookshelf';
import ProfileHeader from './_components/ProfileHeader';
import ProfileStats from './_components/ProfileStats';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<User | null>(null);
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profile);
    };

    fetchUser();
  }, [router]);

  if (!user || !profile) {
    return <p className="text-center mt-10 text-gray-400">로딩 중...</p>;
  }

  return (
    <div className="max-w-3xl w-full mx-auto px-4 py-6">
      <h1 className="text-center text-xl font-semibold mb-6">👤 내 프로필</h1>
      <div className="space-y-6">
        <ProfileHeader user={user} profile={profile} />
        <ProfileBookshelf />
        <ProfileStats />
      </div>
    </div>
  );
}
