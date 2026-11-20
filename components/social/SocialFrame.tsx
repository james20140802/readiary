'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { UserPlus } from 'lucide-react';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions } from '@/components/shell/TopBarContext';
import SocialSegment from './SocialSegment';
import styles from './feed/feed.module.css';

interface SocialFrameProps {
  active: 'feed' | 'talk';
  /** 받은 친구 신청 수 — 상단 바 친구 아이콘의 점 */
  pendingCount: number;
  /** 데스크톱에서 제목 줄 오른쪽에 두는 버튼(모바일에서는 숨는다 — 제목 위치가 두 탭에서 같도록) */
  desktopAction?: React.ReactNode;
  /** 상단 바에 친구 아이콘 앞에 더할 동작(모바일의 주요 행동) */
  topActions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * 소셜의 두 탭(친구의 문장 | 토론)이 함께 쓰는 틀 — 일기장 여백선, 넓은 상자, 큰 제목 줄, 전환, 상단 바 친구 아이콘.
 * 탭을 오가도 배경과 제목 위치가 바뀌지 않게 한 곳에서 그린다.
 */
export default function SocialFrame({
  active,
  pendingCount,
  desktopAction,
  topActions,
  className,
  children,
}: SocialFrameProps) {
  return (
    <div data-social-frame={active} className={clsx('relative', className)}>
      <div aria-hidden data-margin-line className={styles.marginLine} />
      <TopBarActions>
        {topActions}
        <Link
          href="/social/friends"
          aria-label={pendingCount > 0 ? `친구, 받은 신청 ${pendingCount}` : '친구'}
          className="relative grid h-11 w-11 place-items-center rounded-full text-ink"
        >
          <UserPlus size={23} strokeWidth={1.75} aria-hidden />
          {pendingCount > 0 && <span className="topbar-dot" aria-hidden />}
        </Link>
      </TopBarActions>

      <div className={clsx(styles.wide, 'relative z-[1]')}>
        <div className="flex items-center gap-4">
          <div>
            <LargeTitle>소셜</LargeTitle>
          </div>
          {desktopAction && <div className="ml-auto hidden lg:block">{desktopAction}</div>}
        </div>
        <div className="mt-[18px] lg:mt-6">
          <SocialSegment active={active} />
        </div>
        {children}
      </div>
    </div>
  );
}
