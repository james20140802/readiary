'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { BookMarked } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function Header() {
  const isMobile = useIsMobile();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
    <header className="fixed top-0 left-0 w-full py-3 px-4 flex items-center bg-white dark:bg-gray-900 z-50 border-b border-gray-200 dark:border-gray-800">
      <Link
        href={isLoggedIn ? '/protected/dashboard' : '/'}
        className="flex items-center space-x-2"
      >
        <BookMarked size={24} />
        <span className="font-semibold text-lg">Readiary</span>
      </Link>
    </header>
  );
}
