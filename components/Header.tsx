'use client';

import Link from 'next/link';

import { BookMarked } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function Header() {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <header className="fixed top-0 left-0 w-full h-[72px] flex items-center px-4 bg-white dark:bg-gray-900 z-50 border-b border-gray-200 dark:border-gray-800">
      <Link href="/" className="flex items-center space-x-2">
        <BookMarked size={24} />
        <span className="font-semibold text-lg">Readiary</span>
      </Link>
    </header>
  );
}
