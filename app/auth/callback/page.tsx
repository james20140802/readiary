'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (!data || error) {
          router.push('/onboarding');
        } else {
          router.push('/protected');
        }
      } else {
        router.push('/login?from=auth-callback');
      }
    };

    checkSession();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-900 dark:text-white">
      <p className="text-center text-sm">
        이메일 인증이 완료되었습니다. 로그인 페이지로 이동합니다...
      </p>
    </div>
  );
}
