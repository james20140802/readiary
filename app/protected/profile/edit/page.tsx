'use client';

import { useState, useEffect } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
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
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/profile';

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

  const { uploading, updating, imagePath, uploadAvatar, deleteAvatar, updateProfile } = useProfileUpdate(profile);

  const handleUploadAvatar = async (file: File) => {
    const res = await uploadAvatar(file);
    if (res?.success) {
      toast.success('프로필 이미지가 변경되었습니다.');
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleDeleteAvatar = async () => {
    const res = await deleteAvatar();
    if (res?.success) {
      toast.success('프로필 이미지가 삭제되었습니다.');
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

  const handleUpdateProfile = async () => {
    const res = await updateProfile(nickname, name, bio);
    if (res?.success) {
      toast.success('프로필 정보가 저장되었습니다.');
    } else if (res?.error) {
      toast.error(res.error);
    }
  };

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
                <>
                  <Image
                    src={getImageUrl(imagePath) || ''}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={uploading}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                    title="이미지 삭제"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </>
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
                onChange={(e) => e.target.files?.[0] && handleUploadAvatar(e.target.files[0])}
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

        <div className="flex flex-col space-y-4 pt-2">
          <Button
            onClick={handleUpdateProfile}
            disabled={updating || uploading}
            fullWidth
          >
            {updating ? '저장 중...' : '변경사항 저장하기'}
          </Button>

          {/* 비밀번호 변경 섹션 분리 (텍스트 링크로 표시) */}
          <div className="text-center">
            <button
              onClick={() => router.push('/protected/profile/update-password')}
              className="text-sm font-semibold text-label-sub hover:text-label dark:text-label-muted dark:hover:text-label-invert transition-colors underline underline-offset-4"
            >
              비밀번호 변경
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
