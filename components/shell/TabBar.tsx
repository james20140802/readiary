'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, NotebookPen, User, Users, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { NAV_TABS, tabFor } from '@/lib/shell/routes';
import { onTabClick } from './tabScroll';

const ICONS: Record<(typeof NAV_TABS)[number]['key'], LucideIcon> = {
  today: NotebookPen,
  books: Library,
  social: Users,
  me: User,
};

/** 모바일 하단의 떠 있는 탭 바. lg 이상에서는 사이드바가 맡는다. */
export function TabBar({ prefetch = false }: { prefetch?: boolean }) {
  const pathname = usePathname();
  const current = tabFor(pathname);

  return (
    <nav
      aria-label="주요 메뉴"
      className="bar-material tabbar-glass fixed left-4 right-4 z-30 grid h-[var(--app-tabbar-h)] grid-cols-4 rounded-[32px] p-1 bottom-[calc(10px+var(--app-safe-bottom))] lg:hidden"
    >
      {NAV_TABS.map(({ key, href, label }) => {
        const Icon = ICONS[key];
        const active = current === key;
        return (
          <Link
            key={key}
            href={href}
            prefetch={prefetch}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => onTabClick(e, href, pathname)}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 rounded-[28px] text-tab transition-transform duration-150 active:scale-[0.96] motion-reduce:active:scale-100',
              active ? 'tab-on text-accent' : 'text-ink-sub'
            )}
          >
            <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
