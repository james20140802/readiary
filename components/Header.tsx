'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Bell, BookMarked } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRouter } from 'next/navigation';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

export default function Header() {
  const isMobile = useIsMobile();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const hasUnread = useUnreadNotifications(isLoggedIn);

  const router = useRouter();

  useEffect(() => {
    router.prefetch('/protected/dashboard');
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();
  }, []);

  if (!isMobile) return null;

  return (
    <header className="fixed top-0 left-0 w-full py-3 px-4 flex items-center justify-between bg-paper/90 backdrop-blur-md z-50 border-b border-hairline">
      <Link
        href={isLoggedIn ? '/protected/dashboard' : '/'}
        className="flex items-center space-x-2"
        prefetch
      >
        <BookMarked size={24} />
        <span className="font-serif font-bold text-lg tracking-wide">Readiary</span>
      </Link>

      {/* 알림 종 — 모바일은 전역 상단 헤더에 상주 (데스크톱은 상단 GNB가 담당) */}
      {isLoggedIn && (
        <Link
          href="/protected/social/notifications"
          className="relative p-1.5 -mr-1.5 text-ink-sub"
          aria-label="알림"
        >
          <Bell size={20} strokeWidth={1.75} />
          {hasUnread && (
            <span className="absolute top-1 right-1 h-[7px] w-[7px] rounded-full bg-accent">
              <span className="sr-only">읽지 않은 알림 있음</span>
            </span>
          )}
        </Link>
      )}
    </header>
  );
}
