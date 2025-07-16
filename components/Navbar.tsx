'use client';
import { MdHome, MdMenuBook, MdEditNote, MdPerson } from 'react-icons/md';

import Link from 'next/link';
import { BookMarked } from 'lucide-react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  { href: '/protected/dashboard', label: '홈', icon: <MdHome size={20} /> },
  { href: '/protected/books', label: '내 책', icon: <MdMenuBook size={20} /> },
  { href: '/protected/books/new', label: '기록하기', icon: <MdEditNote size={20} /> },
  { href: '/protected/profile', label: '프로필', icon: <MdPerson size={20} /> },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Bottom Navbar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 py-2 block md:hidden">
        <div className="max-w-screen-md mx-auto flex justify-around text-xs text-gray-600 dark:text-gray-300">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center gap-1 py-1 px-2 transition',
                pathname === item.href && 'text-black dark:text-white font-semibold'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop Top Navbar */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 border-b bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-8 py-5">
        <div className="max-w-screen-md mx-auto flex items-center justify-between w-full text-sm text-gray-700 dark:text-gray-300">
          <Link
            href="/"
            className="text-lg font-bold text-black dark:text-white flex items-center gap-2"
          >
            <BookMarked size={20} />
            Readiary
          </Link>
          <div className="flex gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1 rounded-md transition hover:bg-gray-100 dark:hover:bg-gray-800',
                  pathname === item.href && 'text-black dark:text-white font-semibold'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
