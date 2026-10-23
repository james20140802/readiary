'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';

const SETTINGS_HREF = '/notifications/settings';

/** 알림 머리 — 큰 제목, 모바일 상단 바의 설정 단추, 데스크톱의 "알림 설정" 글자 링크 (시안 notifications.html) */
export default function NotificationsHeader() {
  useTopBar({ title: '알림' });
  return (
    <>
      <TopBarActions>
        <Link
          href={SETTINGS_HREF}
          aria-label="알림 설정"
          className="grid h-11 w-11 place-items-center rounded-full text-ink"
        >
          <Settings size={23} strokeWidth={1.75} aria-hidden />
        </Link>
      </TopBarActions>
      <div className="flex items-end justify-between gap-3">
        <div>
          <LargeTitle>알림</LargeTitle>
        </div>
        <Link
          href={SETTINGS_HREF}
          className="hidden min-h-11 items-center font-sans text-[15px] font-semibold text-ink-sub hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent lg:inline-flex"
        >
          알림 설정
        </Link>
      </div>
    </>
  );
}
