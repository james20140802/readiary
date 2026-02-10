'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types/profile';

export function useProfileUpdate(initialProfile: Profile | null) {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // DB에 저장된 파일 이름(상대 경로)만 상태로 관리
  const [imagePath, setImagePath] = useState<string | null>(initialProfile?.profile_image || null);

  // 랜덤 4자리 태그 생성 함수
  const generateRandomTag = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // 이미지 업로드 로직
  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);
      if (!initialProfile) return;

      // 1. 유효성 검사
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !allowedExtensions.includes(fileExt)) {
        alert('jpg, png, webp 파일만 업로드 가능합니다.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('파일 크기는 2MB 이하여야 합니다.');
        return;
      }

      // 2. 업로드 경로 설정 (유저ID/타임스탬프.확장자)
      const fileName = `${initialProfile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. 상태 업데이트 (DB 저장을 위해 상대 경로만 유지)
      setImagePath(fileName);
      return fileName;
    } catch (error) {
      console.error(error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 프로필 정보 업데이트 (중복 체크 포함)
  const updateProfile = async (nickname: string, name: string, bio: string) => {
    try {
      setUpdating(true);
      if (!initialProfile) return;

      let finalTag = initialProfile.tag;

      // 닉네임이 변경된 경우에만 새로운 태그 생성 및 중복 체크 로직 실행
      if (nickname !== initialProfile.nickname) {
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 5;

        while (!isUnique && attempts < maxAttempts) {
          const tempTag = generateRandomTag();

          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('nickname', nickname)
            .eq('tag', tempTag)
            .maybeSingle();

          if (error) throw error;

          if (!data) {
            finalTag = tempTag;
            isUnique = true;
          }
          attempts++;
        }

        if (!isUnique) {
          alert('사용 가능한 닉네임 조합을 찾지 못했습니다. 다시 시도해주세요.');
          return;
        }
      }

      // 4. 최종 업데이트 요청 (상대 경로 imagePath 저장)
      const { error } = await supabase.from('profiles').upsert({
        id: initialProfile.id,
        nickname,
        tag: finalTag,
        name: name,
        bio,
        profile_image: imagePath, // 예: "userid/timestamp.jpg"
      });

      if (error) throw error;

      router.push('/protected/profile');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('프로필 수정에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  return { uploading, updating, imagePath, uploadAvatar, updateProfile };
}
