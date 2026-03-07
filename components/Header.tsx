'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { BookMarked } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRouter } from 'next/navigation';

export default function Header() {
  const isMobile = useIsMobile();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
    <header className="fixed top-0 left-0 w-full py-3 px-4 flex items-center bg-surface dark:bg-dark-surface z-50 border-b border-border dark:border-dark-border">
      <Link
        href={isLoggedIn ? '/protected/dashboard' : '/'}
        className="flex items-center space-x-2"
        prefetch
      >
        <BookMarked size={24} />
        <span className="font-semibold text-lg">Readiary</span>
      </Link>
    </header>
  );
}
