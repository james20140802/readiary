'use client';

import { Pencil, LogOut, Check, Copy } from 'lucide-react';
import Image from 'next/image';
import { Profile } from '@/types/profile';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getImageUrl } from '@/utils/profile';

export default function ProfileHeader({ user, profile }: { user: User; profile: Profile }) {
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
    <section className="px-6 pt-12 pb-8 flex flex-col items-center sm:items-start sm:flex-row gap-8 transition-all">
      {/* 1. 프로필 이미지 영역 */}
      <div className="relative group shrink-0">
        <div className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden bg-white dark:bg-zinc-900 border-[2.5px] border-zinc-400 dark:border-zinc-500 shadow-xl shadow-zinc-200/50 dark:shadow-none transition-all group-hover:scale-[1.02] duration-500 p-1">
          <div className="relative w-full h-full rounded-[2.2rem] overflow-hidden bg-zinc-50 dark:bg-zinc-800">
            {profileUrl ? (
              <Image src={profileUrl} alt="profile" fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-black text-zinc-300 dark:text-zinc-600 select-none">
                {profile.nickname?.at(0)?.toUpperCase() ?? 'U'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. 유저 정보 및 액션 영역 */}
      <div className="flex-1 flex flex-col justify-center text-center sm:text-left min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between w-full">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
              {profile.name || '이름 없음'}
            </h2>
            {/* 복사 기능이 추가된 닉네임 영역 */}
            <button
              onClick={handleCopyTag}
              className="group/copy flex items-center justify-center sm:justify-start gap-1.5 transition-all active:scale-95"
            >
              <p className="text-[15px] font-bold text-zinc-400 font-mono group-hover/copy:text-zinc-600 dark:group-hover/copy:text-zinc-300 transition-colors">
                @{profile.nickname}#{profile.tag || '0000'}
              </p>
              <div className="flex items-center justify-center">
                {copied ? (
                  <Check size={14} className="text-green-500 animate-in fade-in zoom-in" />
                ) : (
                  <Copy
                    size={14}
                    className="text-zinc-300 opacity-0 group-hover/copy:opacity-100 transition-opacity"
                  />
                )}
              </div>
              {copied && (
                <span className="text-[10px] font-bold text-green-500 animate-in slide-in-from-left-1">
                  Copied!
                </span>
              )}
            </button>
          </div>

          {isOwnProfile && (
            <div className="flex items-center justify-center sm:justify-end gap-1 -mr-2">
              <button
                onClick={() => router.push('/protected/profile/edit')}
                className="p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-90"
                title="프로필 수정"
              >
                <Pencil size={22} strokeWidth={2.5} />
              </button>
              <button
                onClick={async () => {
                  const supabase = createSupabaseClient();
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="p-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-zinc-400 hover:text-red-500 active:scale-90"
                title="로그아웃"
              >
                <LogOut size={22} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {profile.bio ? (
          <p className="mt-5 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-medium max-w-xl break-keep">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-5 text-[15px] text-zinc-300 dark:text-zinc-600 italic">
            {isOwnProfile
              ? '아직 소개가 없습니다. 자신을 한 문장으로 표현해보세요.'
              : '등록된 소개가 없습니다.'}
          </p>
        )}
      </div>
    </section>
  );
}
