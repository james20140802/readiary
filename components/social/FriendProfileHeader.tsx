'use client';

import Link from 'next/link';
import type { Profile } from '@/types/profile';
import { useTopBar } from '@/components/shell/TopBarContext';
import FriendAvatar from '@/components/social/friends/FriendAvatar';

interface Props {
  profile: Profile;
  /** 모바일 상단 바에 보일 이 화면의 이름 */
  title: string;
}

/**
 * 친구의 책·기록 화면 머리 — 누구의 서재 안인지 알려 주고 서재로 돌아가는 길.
 * 모바일 상단 바에는 "‹ 윤서의 서재"가 뒤로 가기로 선다.
 */
export default function FriendProfileHeader({ profile, title }: Props) {
  const libraryHref = `/social/u/${profile.nickname}-${profile.tag}`;
  useTopBar({ title, back: { href: libraryHref, label: `${profile.name}의 서재` } });

  return (
    <Link
      href={libraryHref}
      className="inline-flex items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <FriendAvatar profile={profile} className="!h-10 !w-10" />
      <span>
        <span className="block font-sans text-[17px] font-semibold text-ink">
          <span data-skeleton>{profile.name}</span>의 서재
        </span>
        <span data-skeleton className="block font-sans text-[14px] font-medium text-ink-sub">
          {profile.nickname}#{profile.tag}
        </span>
      </span>
    </Link>
  );
}
