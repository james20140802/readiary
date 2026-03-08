'use client';

import { Pencil, LogOut, Check, Copy } from 'lucide-react';
import Image from 'next/image';
import { Profile } from '@/types/profile';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getImageUrl } from '@/utils/profile';
import RemoveFriendButton from '@/components/social/RemoveFriendButton';

interface Props {
  user: User;
  profile: Profile;
  isFriend?: boolean;
}

export default function ProfileHeader({ user, profile, isFriend = false }: Props) {
  const router = useRouter();
  const isOwnProfile = user.id === profile.id;
  const [copied, setCopied] = useState(false);
  const profileUrl = getImageUrl(profile.profile_image);

  const handleCopyTag = async () => {
    const fullTag = `${profile.nickname}#${profile.tag || '0000'}`;
    try {
      await navigator.clipboard.writeText(fullTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  return (
    <section className="pt-8 pb-8 flex flex-col items-center sm:items-start sm:flex-row gap-8">
      {/* 프로필 이미지 */}
      <div className="relative group shrink-0">
        <div className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden bg-surface dark:bg-dark-surface border-2 border-border-strong dark:border-dark-border shadow-card-lg transition-all group-hover:scale-[1.02] duration-500 p-1">
          <div className="relative w-full h-full rounded-[2.2rem] overflow-hidden bg-surface-raised dark:bg-dark-raised">
            {profileUrl ? (
              <Image src={profileUrl} alt="profile" fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-black text-label-muted select-none">
                {profile.nickname?.at(0)?.toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 유저 정보 */}
      <div className="flex-1 flex flex-col justify-center text-center sm:text-left min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between w-full">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-label dark:text-label-invert tracking-tight leading-none">
              {profile.name || '이름 없음'}
            </h2>
            <div className="flex justify-center sm:justify-start">
              <button
                onClick={handleCopyTag}
                className="group/copy relative inline-flex items-center transition-all active:scale-95"
              >
                <p className="text-[15px] font-bold text-label-muted font-mono group-hover/copy:text-label-sub transition-colors">
                  @{profile.nickname}#{profile.tag || '0000'}
                </p>
                <div className="absolute left-full ml-1.5 flex items-center justify-center">
                  {copied ? (
                    <Check size={14} className="text-success animate-in fade-in zoom-in" />
                  ) : (
                    <Copy
                      size={14}
                      className="text-label-muted opacity-0 group-hover/copy:opacity-100 transition-opacity"
                    />
                  )}
                  {copied && (
                    <span className="absolute left-full ml-1.5 whitespace-nowrap text-[10px] font-bold text-success animate-in slide-in-from-left-1">
                      Copied!
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* 내 프로필: 수정 + 로그아웃 / 친구 프로필: 친구 삭제 */}
          <div className="flex items-center justify-center sm:justify-end gap-1 -mr-2">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => router.push('/protected/profile/edit')}
                  className="p-3 rounded-2xl hover:bg-surface-raised dark:hover:bg-dark-raised transition-all text-label-muted hover:text-label dark:hover:text-label-invert active:scale-90"
                  title="프로필 수정"
                >
                  <Pencil size={22} strokeWidth={2.5} />
                </button>
                <button
                  onClick={async () => {
                    const supabase = createSupabaseClient();
                    await supabase.auth.signOut();
                    router.push('/login');
                    router.refresh();
                  }}
                  className="p-3 rounded-2xl hover:bg-danger-subtle dark:hover:bg-danger/10 transition-all text-label-muted hover:text-danger active:scale-90"
                  title="로그아웃"
                >
                  <LogOut size={22} strokeWidth={2.5} />
                </button>
              </>
            ) : isFriend ? (
              <RemoveFriendButton friendId={profile.id} />
            ) : null}
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-5 text-[15px] leading-relaxed text-label-sub dark:text-label-muted font-medium max-w-xl break-keep">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-5 text-[15px] text-label-muted italic">
            {isOwnProfile
              ? '아직 소개가 없습니다. 자신을 한 문장으로 표현해보세요.'
              : '등록된 소개가 없습니다.'}
          </p>
        )}
      </div>
    </section>
  );
}
