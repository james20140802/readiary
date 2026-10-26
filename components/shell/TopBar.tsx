'use client';

import Link from 'next/link';
import { Bell, ChevronLeft, Search } from 'lucide-react';
import { useTopBarState } from './TopBarContext';

const ICON_BUTTON = 'relative grid h-11 w-11 place-items-center rounded-full text-ink';
const BACK =
  'mr-auto flex min-h-11 items-center gap-0.5 font-sans text-[17px] font-normal text-accent';

/** 모바일 상단 바. 스크롤해 큰 제목이 가려지면 작은 제목과 간지 재질이 나타난다. lg 이상에서는 사이드바가 맡는다. */
export function TopBar({ hasUnread }: { hasUnread: boolean }) {
  const { config, scrolled, leafTitle, actionsCount, setActionsSlot } = useTopBarState();
  const title = leafTitle ?? config.title ?? '';
  // 장 제목은 고정 문구라 그대로, 화면이 정한 제목은 불러오는 동안 자리용 글일 수 있어 막대로
  const pending = !!config.pending;
  const barTitle = pending && !leafTitle;

  return (
    <header
      className={`topbar fixed inset-x-0 top-0 z-30 flex items-center gap-0.5 lg:hidden${scrolled ? ' topbar--scrolled' : ''}`}
    >
      {config.back && pending ? (
        // 불러오는 동안의 뒤로는 자리용 주소일 수 있다 — 모양만 두고 누를 수 없게
        <span aria-hidden="true" inert className={`skeleton-scope ${BACK}`}>
          <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
          {config.back.data ? <span data-skeleton>{config.back.label}</span> : config.back.label}
        </span>
      ) : config.back ? (
        <Link href={config.back.href} className={BACK}>
          <ChevronLeft size={24} strokeWidth={2.2} aria-hidden="true" />
          {config.back.label}
        </Link>
      ) : config.brand ? (
        <span className="topbar-brand mr-auto font-serif text-[22px] font-bold">Readiary</span>
      ) : (
        <span className="mr-auto" />
      )}
      {title && (
        <span
          aria-hidden={!scrolled || barTitle}
          className={`topbar-title${barTitle ? ' skeleton-scope' : ''} pointer-events-none absolute bottom-[14px] left-[70px] right-[70px] overflow-hidden text-ellipsis whitespace-nowrap text-center font-sans text-[17px] font-semibold`}
        >
          {barTitle ? <span data-skeleton>{title}</span> : title}
        </span>
      )}
      <span ref={setActionsSlot} className="contents" />
      {actionsCount === 0 && (
        <>
          <Link href="/search" aria-label="책과 기록 찾기" className={ICON_BUTTON}>
            <Search size={23} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link
            href="/social/notifications"
            aria-label={hasUnread ? '알림, 새 소식 있음' : '알림'}
            className={ICON_BUTTON}
          >
            <Bell size={23} strokeWidth={1.75} aria-hidden="true" />
            {hasUnread && <span className="topbar-dot" aria-hidden="true" />}
          </Link>
        </>
      )}
    </header>
  );
}
