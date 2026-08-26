'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      const supabase = createSupabaseClient();
      await supabase.auth.signOut();
      router.push('/login');
    };
    logout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <p className="text-ink-sub">로그아웃 중...</p>
    </div>
  );
}
