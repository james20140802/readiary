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
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

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
        <h1 className="text-page-title font-black text-label dark:text-label-invert ml-4">
          프로필 수정
        </h1>
      </header>

      <div className="space-y-10">
        {/* 이미지 수정 섹션 */}
        <section className="flex flex-col items-center sm:flex-row gap-8">
          <div className="relative group shrink-0">
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-surface-raised dark:bg-dark-raised border-2 border-border dark:border-dark-border relative shadow-xl">
              {imagePath ? (
                <Image
                  src={`/profile-images/${imagePath}`}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-label-muted font-black text-4xl uppercase">
                  {nickname?.at(0) || 'U'}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2.5 bg-dark-surface dark:bg-surface text-label-invert dark:text-label rounded-2xl cursor-pointer hover:scale-110 shadow-lg transition-transform">
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
            <h3 className="font-bold text-label dark:text-label-invert">프로필 사진</h3>
            <p className="text-caption text-label-muted mt-1 font-medium">
              나를 나타내는 멋진 사진을 올려보세요.
            </p>
          </div>
        </section>

        {/* 텍스트 입력 섹션 */}
        <div className="space-y-6">
          <FormGroup>
            <FormLabel>이름</FormLabel>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 입력"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>닉네임</FormLabel>
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 입력"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>한줄 소개</FormLabel>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="나를 소개해주세요."
              fullWidth
              className="resize-none"
            />
          </FormGroup>
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
