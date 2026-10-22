'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Library,
  NotebookPen,
  Plus,
  Search,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { NAV_TABS, tabFor } from '@/lib/shell/routes';

const ICONS: Record<(typeof NAV_TABS)[number]['key'], LucideIcon> = {
  today: NotebookPen,
  books: Library,
  social: Users,
  me: User,
};

const ITEM =
  'relative flex h-11 items-center gap-3 rounded-[10px] px-3 font-sans text-[16px] font-medium text-ink transition-colors hover:bg-ink/5';

/** 데스크톱(lg 이상) 왼쪽에 떠 있는 사이드바. 모바일에서는 탭 바가 맡는다. */
export function Sidebar({ hasUnread }: { hasUnread: boolean }) {
  const current = tabFor(usePathname());

  return (
    <aside
      aria-label="주요 메뉴"
      className="sidebar-material sidebar-glass fixed bottom-3 left-3 top-3 z-30 hidden w-[calc(var(--app-side)-24px)] flex-col rounded-[18px] px-3 py-[18px] lg:flex"
    >
      <Link href="/today" prefetch className="px-3 pb-[22px] pt-1 font-serif text-[24px] font-bold">
        Readiary
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_TABS.map(({ key, href, label }) => {
          const Icon = ICONS[key];
          const active = current === key;
          return (
            <Link
              key={key}
              href={href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={clsx(ITEM, active && 'side-item-on font-[650]')}
            >
              <Icon
                size={21}
                strokeWidth={1.75}
                className={active ? 'text-accent' : 'text-ink-sub'}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}

        <div className="mt-[14px] flex flex-col gap-0.5">
          <Link
            href="/search"
            aria-current={current === 'search' ? 'page' : undefined}
            className={clsx(ITEM, current === 'search' && 'side-item-on font-[650]')}
          >
            <Search
              size={21}
              strokeWidth={1.75}
              className={current === 'search' ? 'text-accent' : 'text-ink-sub'}
              aria-hidden="true"
            />
            찾기
          </Link>
          <Link
            href="/social/notifications"
            aria-current={current === 'bell' ? 'page' : undefined}
            className={clsx(ITEM, current === 'bell' && 'side-item-on font-[650]')}
          >
            <Bell
              size={21}
              strokeWidth={1.75}
              className={current === 'bell' ? 'text-accent' : 'text-ink-sub'}
              aria-hidden="true"
            />
            알림
            {hasUnread && (
              <span className="ml-auto h-2 w-2 rounded-full bg-accent">
                <span className="sr-only">새 소식 있음</span>
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div className="flex-1" />

      <Button asChild className="h-[46px] w-full rounded-[23px]">
        <Link href="/books/new">
          <Plus size={20} strokeWidth={1.75} aria-hidden="true" />책 등록
        </Link>
      </Button>
    </aside>
  );
}
