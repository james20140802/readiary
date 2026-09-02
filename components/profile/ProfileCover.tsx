'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
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
  /** 표지 옆(넓은 화면)·아래(좁은 화면)에 놓을 것 — 판권면 */
  children?: ReactNode;
}

/**
 * 프로필 표지 — 이 사람을 책 한 권으로. 넓은 화면에서는 세로 판형의 책 한 권이 왼쪽에 서고
 * 오른쪽에 판권면과 조작이 붙는다. 좁은 화면에서는 위아래로 쌓인다.
 * 표지는 이중 보더 판 위에 표제(이름)와 저자 줄(@닉네임#태그), 종이에 붙인 사진,
 * 판 밖까지 감싸는 띠지(소개). 경첩 홈 한 줄과 앞마구리 쪽 둥근 모서리가 책의 방향을 준다.
 * 물건은 그리지 않는다 — 다크모드에서는 북라이트의 빛만 표지를 비스듬히 비춘다.
 */
export default function ProfileCover({ user, profile, isFriend = false, children }: Props) {
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
    <div className="sm:flex sm:items-stretch sm:gap-10">
      {/* 책 한 권 — 넓은 화면에서는 세로 판형으로 선다 */}
      <section
        aria-label={`${profile.name || profile.nickname}의 프로필`}
        className="relative flex flex-col rounded-l-sm rounded-r-[7px] border border-hairline-strong bg-card p-[5px] sm:w-[312px] sm:shrink-0"
      >
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-l-[2px] rounded-r-[4px] border border-hairline">
          {/* 북라이트 — 왼쪽 위에서 비스듬히. 램프는 그리지 않는다 */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[18%] top-[-6rem] h-80 w-[36rem] max-w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,196,110,0.16),transparent_66%)]"
          />
          {/* 경첩 홈 — 책등 쪽에 눌린 한 줄 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-2 w-px bg-hairline"
          />

          <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-7 pb-9 pt-10 text-center sm:min-h-[372px]">
            {/* 표지에 붙인 사진 — 인화지 여백에 살짝 비스듬히 */}
            <div
              className="w-[120px] shrink-0 border border-hairline bg-card p-[5px]"
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
                    sizes="120px"
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
            <div className="min-w-0 max-w-full">
              <Seal>讀者</Seal>
              <h1 className="mt-1.5 text-balance break-keep font-serif text-[28px] font-bold leading-tight text-ink sm:text-[30px]">
                {profile.name || '이름 없음'}
              </h1>
              {/* "복사됨"은 흐름 밖에 — 자리를 차지하면 핸들이 한쪽으로 밀린다 */}
              <button
                type="button"
                onClick={handleCopyTag}
                title="닉네임#태그 복사"
                className="relative mt-2.5 inline-block font-sans text-[12.5px] tabular-nums text-ink-faint transition-colors hover:text-ink-sub"
              >
                @{handle}
                <span
                  aria-live="polite"
                  className={`absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-[11px] transition-opacity ${
                    copied ? 'text-accent opacity-100' : 'opacity-0'
                  }`}
                >
                  복사됨
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 띠지 — 판 밖까지 감싸는 별지. 위아래 강한 괘선, 오른쪽 끝에 출판사 자리의 표식 */}
        {profile.bio ? (
          <div className="relative z-10 -mx-2 -mb-2 flex items-center gap-4 border-y border-hairline-strong bg-card-raised px-7 py-4 shadow-[0_-1px_0_rgb(var(--card))]">
            <p className="min-w-0 flex-1 text-balance break-keep font-serif text-[14px] leading-relaxed text-ink">
              {profile.bio}
            </p>
            <Seal className="shrink-0 opacity-70">Readiary</Seal>
          </div>
        ) : isOwnProfile ? (
          <Link
            href="/protected/profile/edit"
            className="relative z-10 -mx-2 -mb-2 flex items-center justify-between gap-4 border-y border-hairline-strong bg-card-raised px-7 py-4 font-serif text-[13.5px] text-ink-faint transition-colors hover:text-accent"
          >
            <span>띠지에 한 줄 소개를 써 두세요 →</span>
            <Seal className="shrink-0 opacity-70">Readiary</Seal>
          </Link>
        ) : null}
      </section>

      {/* 표지 옆 — 판권면과 조용한 조작 한 줄 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="order-1 mt-4 flex items-center justify-end gap-5 text-[13px] text-ink-faint sm:order-2 sm:mt-auto sm:pt-6">
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
        {children && <div className="order-2 mt-8 sm:order-1 sm:mt-0">{children}</div>}
      </div>
    </div>
  );
}
