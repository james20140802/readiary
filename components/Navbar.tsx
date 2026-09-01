'use client';
import Link from 'next/link';
import { Bell, BookMarked, Home, LibraryBig, Globe, UserRound } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

const navItems = [
  { href: '/protected/dashboard', label: '홈', icon: <Home size={20} strokeWidth={1.75} /> },
  { href: '/protected/books', label: '내 책', icon: <LibraryBig size={20} strokeWidth={1.75} /> },
  { href: '/protected/social', label: '소셜', icon: <Globe size={20} strokeWidth={1.75} /> },
  { href: '/protected/profile', label: '프로필', icon: <UserRound size={20} strokeWidth={1.75} /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const hasUnread = useUnreadNotifications(!!user);
  const supabase = createSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    router.prefetch('/protected/dashboard');
    router.prefetch('/protected/books');
    router.prefetch('/protected/social');
    router.prefetch('/protected/profile');
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
    };
    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {/* Mobile Bottom Navbar */}
      {user && (
        <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-hairline bg-paper/90 backdrop-blur-md px-4 py-2 block md:hidden">
          <div className="max-w-screen-md mx-auto flex justify-around text-xs text-ink-sub">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center gap-1 py-1 px-2 transition',
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? 'text-accent font-semibold'
                    : 'text-ink-faint'
                )}
                prefetch
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Desktop Top Navbar */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 border-b border-hairline bg-paper/90 backdrop-blur-md px-8 py-5">
        <div className="max-w-screen-md mx-auto flex items-center justify-between w-full text-sm text-ink-sub">
          <Link
            href="/"
            className="font-serif text-lg font-bold tracking-wide text-ink flex items-center gap-2"
            prefetch
          >
            <BookMarked size={20} />
            Readiary
          </Link>
          {user && (
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1 rounded-md transition hover:bg-card-raised',
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? 'text-ink font-semibold'
                      : 'text-ink-faint'
                  )}
                  prefetch
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              {/* 알림 종 — 데스크톱에서는 전역 크롬에 상주 (모바일은 소셜 페이지 헤더가 담당) */}
              <Link
                href="/protected/social/notifications"
                className={clsx(
                  'relative flex items-center px-2.5 py-1.5 rounded-md transition hover:bg-card-raised',
                  pathname === '/protected/social/notifications' ? 'text-ink' : 'text-ink-faint'
                )}
                aria-label="알림"
              >
                <Bell size={20} strokeWidth={1.75} />
                {hasUnread && (
                  <span className="absolute top-1 right-1.5 h-[7px] w-[7px] rounded-full bg-accent">
                    <span className="sr-only">읽지 않은 알림 있음</span>
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
