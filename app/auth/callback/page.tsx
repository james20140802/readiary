'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const handleAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!data || error) {
        router.push('/onboarding');
      } else {
        router.push('/protected');
      }
    };

    handleAuth();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-900 dark:text-white">
      <p className="text-center text-sm">로그인 처리 중입니다...</p>
    </div>
  );
}
