'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';
import Seal from '@/components/ui/Seal';
import RemoveFriendButton from '@/components/social/RemoveFriendButton';
import { createSupabaseClient } from '@/lib/supabase/client';
import { buildInviteSlug } from '@/lib/social/invite';
import { photoTilt } from '@/lib/books/openBook';
import { getImageUrl } from '@/utils/profile';

interface Props {
  user: User;
  profile: Profile;
  isFriend?: boolean;
}

/**
 * 프로필 표지 — 이 사람을 책 한 권으로. 발췌집·장서표의 이중 보더 판 위에
 * 표제(이름)와 저자 줄(@닉네임#태그), 종이에 붙인 사진, 아래를 가로지르는 띠지(소개).
 * 물건은 그리지 않는다 — 다크모드에서는 북라이트의 빛만 표지를 비스듬히 비춘다.
 * 조작(공유·수정·로그아웃·친구 삭제)은 표지 밖 아래 한 줄로.
 */
export default function ProfileCover({ user, profile, isFriend = false }: Props) {
  const router = useRouter();
  const isOwnProfile = user.id === profile.id;
  const [copied, setCopied] = useState(false);
  const photoUrl = getImageUrl(profile.profile_image);
  const handle = `${profile.nickname}#${profile.tag || '0000'}`;

  const handleCopyTag = async () => {
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const handleShareInvite = async () => {
    const inviteUrl = `${window.location.origin}/invite/${encodeURIComponent(
      buildInviteSlug(profile.nickname, profile.tag)
    )}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Readiary에서 친구 맺기', url: inviteUrl });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success('초대 링크를 복사했습니다.');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        console.error('초대 링크 공유 실패:', error);
      }
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div>
      <section
        aria-label={`${profile.name || profile.nickname}의 프로필`}
        className="rounded-sm border border-hairline-strong bg-card p-[5px]"
      >
        <div className="relative overflow-hidden rounded-[2px] border border-hairline">
          {/* 북라이트 — 왼쪽 위에서 비스듬히. 램프는 그리지 않는다 */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[18%] top-[-6rem] h-80 w-[36rem] max-w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,196,110,0.16),transparent_66%)]"
          />

          <div className="relative flex flex-col items-center gap-6 px-6 pb-8 pt-9 text-center sm:flex-row sm:items-center sm:gap-9 sm:px-10 sm:pb-10 sm:pt-10 sm:text-left">
            {/* 표지에 붙인 사진 — 인화지 여백에 살짝 비스듬히 */}
            <div
              className="w-[112px] shrink-0 border border-hairline bg-card p-[5px] sm:w-[128px]"
              style={{
                transform: `rotate(${photoTilt(profile.id)}deg)`,
                boxShadow: '0 1px 1px rgb(var(--ink) / 0.12), 0 5px 12px rgb(var(--ink) / 0.10)',
              }}
            >
              <div className="relative aspect-square overflow-hidden bg-card-raised">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
                    alt={`${profile.name || profile.nickname}의 사진`}
                    fill
                    sizes="128px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full select-none items-center justify-center font-serif text-4xl text-ink-faint">
                    {profile.nickname?.at(0)?.toUpperCase() ?? 'U'}
                  </div>
                )}
              </div>
            </div>

            {/* 표제와 저자 줄 */}
            <div className="min-w-0 flex-1">
              <Seal>讀者</Seal>
              <h1 className="mt-1.5 text-balance break-keep font-serif text-[28px] font-bold leading-tight text-ink sm:text-[34px]">
                {profile.name || '이름 없음'}
              </h1>
              <button
                type="button"
                onClick={handleCopyTag}
                title="닉네임#태그 복사"
                className="mt-2.5 inline-flex items-center gap-2 font-sans text-[12.5px] tabular-nums text-ink-faint transition-colors hover:text-ink-sub"
              >
                <span>@{handle}</span>
                <span
                  aria-live="polite"
                  className={`text-[11px] transition-opacity ${copied ? 'text-accent opacity-100' : 'opacity-0'}`}
                >
                  복사됨
                </span>
              </button>
            </div>
          </div>

          {/* 띠지 — 표지 아래를 가로지르는 한 줄 소개 */}
          {profile.bio ? (
            <p className="relative border-t border-hairline bg-card-raised px-6 py-3.5 text-center font-serif text-[14px] leading-relaxed text-ink break-keep sm:px-10 sm:text-left">
              {profile.bio}
            </p>
          ) : isOwnProfile ? (
            <Link
              href="/protected/profile/edit"
              className="relative block border-t border-hairline px-6 py-3.5 text-center font-serif text-[13.5px] text-ink-faint transition-colors hover:text-accent sm:px-10 sm:text-left"
            >
              띠지에 한 줄 소개를 써 두세요 →
            </Link>
          ) : null}
        </div>
      </section>

      {/* 표지 밖 — 조용한 조작 한 줄 */}
      <div className="mt-3 flex items-center justify-end gap-5 text-[13px] text-ink-faint">
        {isOwnProfile ? (
          <>
            <button
              type="button"
              onClick={handleShareInvite}
              className="transition-colors hover:text-ink-sub"
            >
              초대 링크
            </button>
            <Link href="/protected/profile/edit" className="transition-colors hover:text-ink-sub">
              프로필 수정
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="transition-colors hover:text-danger"
            >
              로그아웃
            </button>
          </>
        ) : isFriend ? (
          <RemoveFriendButton friendId={profile.id} />
        ) : null}
      </div>
    </div>
  );
}
