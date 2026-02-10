'use client';

import { useState, useEffect } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useProfileUpdate } from '@/hooks/useProfileUpdate';
import { Profile } from '@/types/profile';
import BackButton from '@/components/ui/BackButton';
import Button from '@/components/ui/Button';

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  // 1. 프로필 초기 데이터 불러오기
  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setNickname(data.nickname || '');
        setName(data.name || '');
        setBio(data.bio || '');
      }
    }
    loadData();
  }, [supabase, router]);

  // 커스텀 훅 연결 (imagePath는 훅에서 관리하는 최신 상대 경로)
  const { uploading, updating, imagePath, uploadAvatar, updateProfile } = useProfileUpdate(profile);

  if (!profile)
    return (
      <div className="p-20 text-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );

  return (
    <main>
      <header className="flex items-center mb-6">
        <BackButton />
        <h1 className="text-page-title font-black text-zinc-900 dark:text-zinc-100 ml-4">
          프로필 수정
        </h1>
      </header>

      <div className="space-y-12">
        {/* 이미지 수정 섹션 */}
        <section className="flex flex-col items-center sm:flex-row gap-8">
          <div className="relative group shrink-0">
            <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 relative shadow-xl">
              {imagePath ? (
                <Image
                  /* 가상 경로(/profile-images)와 훅의 상대 경로를 결합 */
                  src={`/profile-images/${imagePath}`}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300 font-black text-4xl uppercase">
                  {nickname?.at(0) || 'U'}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl cursor-pointer hover:scale-110 shadow-lg transition-transform">
              <Camera size={18} strokeWidth={2.5} />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                disabled={uploading}
              />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">프로필 사진</h3>
            <p className="text-sm text-zinc-400 mt-1 font-medium">
              나를 나타내는 멋진 사진을 올려보세요.
            </p>
          </div>
        </section>

        {/* 텍스트 입력 섹션 */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-zinc-900 dark:text-zinc-100 ml-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none transition-all font-bold"
              placeholder="이름 입력"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-zinc-900 dark:text-zinc-100 ml-1">
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-5 py-4 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none transition-all font-bold"
              placeholder="닉네임 입력"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black text-zinc-900 dark:text-zinc-100 ml-1">
              한줄 소개
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-5 py-4 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none transition-all font-bold resize-none"
              placeholder="나를 소개해주세요."
            />
          </div>
        </div>

        <Button
          onClick={() => updateProfile(nickname, name, bio)}
          disabled={updating || uploading}
          fullWidth
        >
          {updating ? '저장 중...' : '변경사항 저장하기'}
        </Button>
      </div>
    </main>
  );
}
