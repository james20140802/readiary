'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

/** 링크로 로그아웃하는 경로 — 이 기기의 세션만 끊는다(다른 기기는 그대로) */
export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      const supabase = createSupabaseClient();
      await supabase.auth.signOut({ scope: 'local' });
      router.replace('/login');
      router.refresh();
    };
    logout();
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-body-sm text-ink-sub">로그아웃 중...</p>
    </div>
  );
}
