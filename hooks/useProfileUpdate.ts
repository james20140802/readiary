'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { AvatarDraft, AvatarCleanupError } from '@/lib/profile/avatarDraft';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types/profile';
import { validateNickname } from '@/lib/profile/nickname';

export function useProfileUpdate(initialProfile: Profile | null) {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [updating, setUpdating] = useState(false);
  const saving = useRef(false);
  const [, refreshAvatar] = useReducer((value: number) => value + 1, 0);
  const [avatar, setAvatar] = useState(() => ({
    userId: initialProfile?.id,
    draft: new AvatarDraft(initialProfile?.id ?? '', initialProfile?.profile_image ?? null),
  }));
  if (initialProfile?.id !== avatar.userId) {
    setAvatar({
      userId: initialProfile?.id,
      draft: new AvatarDraft(initialProfile?.id ?? '', initialProfile?.profile_image ?? null),
    });
  }
  useEffect(() => () => avatar.draft.dispose(), [avatar]);

  // 랜덤 4자리 태그 생성 함수
  const generateRandomTag = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const selectAvatar = async (file: File | null) => {
    if (!initialProfile) return { success: false, error: '프로필 정보가 없습니다.' };
    if (saving.current) return { success: false, error: '저장이 끝난 뒤 사진을 변경해주세요.' };
    try {
      avatar.draft.select(file);
      refreshAvatar();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '사진을 변경하지 못했습니다.',
      };
    }
  };
  const deleteAvatar = () => selectAvatar(null);
  const uploadAvatar = (file: File) => selectAvatar(file);

  // 프로필 정보 업데이트 (중복 체크 포함)
  // featuredEntryId(뒷표지 인용)는 바꿨을 때만 넘긴다 — undefined면 컬럼을 건드리지 않아
  // 마이그레이션 전 DB에서도 나머지 저장이 깨지지 않는다
  const updateProfile = async (
    nickname: string,
    name: string,
    bio: string,
    featuredEntryId?: string | null,
    bookmarkUserBookId?: string | null
  ) => {
    if (saving.current) return { success: false, error: '이미 저장 중입니다.' };
    saving.current = true;
    try {
      setUpdating(true);
      if (!initialProfile) return { success: false, error: '프로필 정보가 없습니다.' };

      // 규칙 도입 전 닉네임(20자 초과 등)은 바꾸지 않는 한 그대로 둔다 — 바꿀 때만 검사
      const nicknameError =
        nickname !== initialProfile.nickname ? validateNickname(nickname) : null;
      if (nicknameError) {
        return { success: false, error: nicknameError };
      }

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
          return {
            success: false,
            error: '사용 가능한 닉네임 조합을 찾지 못했습니다. 다시 시도해주세요.',
          };
        }
      }

      const bucket = supabase.storage.from('profiles');
      await avatar.draft.save(
        {
          async upload(path, file) {
            const { error } = await bucket.upload(path, file, { upsert: false, cacheControl: '0' });
            if (error) throw error;
          },
          async remove(paths) {
            const { error } = await bucket.remove(paths);
            if (error) throw error;
          },
        },
        async (imagePath) => {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              nickname,
              tag: finalTag,
              name,
              bio,
              profile_image: imagePath,
              ...(featuredEntryId !== undefined ? { featured_entry_id: featuredEntryId } : {}),
              ...(bookmarkUserBookId !== undefined
                ? { bookmark_user_book_id: bookmarkUserBookId }
                : {}),
            })
            .eq('id', initialProfile.id)
            .select('id')
            .single();
          if (error || !data) throw error ?? new Error('프로필을 찾을 수 없습니다.');
        }
      );

      router.push('/protected/profile');
      router.refresh();
      return { success: true };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: error instanceof AvatarCleanupError ? error.message : '프로필 수정에 실패했습니다.',
      };
    } finally {
      saving.current = false;
      setUpdating(false);
      refreshAvatar();
    }
  };

  return {
    uploading: false,
    updating,
    imagePath: avatar.draft.source,
    uploadAvatar,
    deleteAvatar,
    updateProfile,
  };
}
