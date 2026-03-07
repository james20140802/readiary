'use client';
import { MdHome, MdMenuBook, MdPerson, MdPublic } from 'react-icons/md';
import Link from 'next/link';
import { BookMarked } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { User } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/protected/dashboard', label: '홈', icon: <MdHome size={20} /> },
  { href: '/protected/books', label: '내 책', icon: <MdMenuBook size={20} /> },
  { href: '/protected/social', label: '소셜', icon: <MdPublic size={20} /> },
  { href: '/protected/profile', label: '프로필', icon: <MdPerson size={20} /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
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
        <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border dark:border-dark-border bg-surface/80 dark:bg-dark-surface/80 backdrop-blur-md px-4 py-2 block md:hidden">
          <div className="max-w-screen-md mx-auto flex justify-around text-xs text-label-sub dark:text-label-muted">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center gap-1 py-1 px-2 transition',
                  pathname === item.href ? 'text-tint font-semibold' : 'text-label-muted'
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
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 border-b border-border dark:border-dark-border bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-8 py-5">
        <div className="max-w-screen-md mx-auto flex items-center justify-between w-full text-sm text-label-sub dark:text-label-muted">
          <Link
            href="/"
            className="text-lg font-bold text-label dark:text-label-invert flex items-center gap-2"
            prefetch
          >
            <BookMarked size={20} />
            Readiary
          </Link>
          {user && (
            <div className="flex gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1 rounded-md transition hover:bg-surface-raised dark:hover:bg-dark-raised',
                    pathname === item.href
                      ? 'text-label dark:text-label-invert font-semibold'
                      : 'text-label-muted'
                  )}
                  prefetch
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
