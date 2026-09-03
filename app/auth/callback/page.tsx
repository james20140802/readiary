'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

type Destination = 'onboarding' | 'dashboard' | 'login';

const MESSAGES: Record<Destination, string> = {
  onboarding: '이메일 인증이 완료되었습니다. 프로필 설정으로 이동합니다...',
  dashboard: '이메일 인증이 완료되었습니다. 홈으로 이동합니다...',
  login: '인증 정보를 확인하지 못했습니다. 로그인 페이지로 이동합니다...',
};

/** 이메일 인증 링크 착지 — 브라우저 클라이언트가 URL의 토큰으로 세션을 세운 뒤 목적지를 정한다 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setDestination('login');
        router.replace('/login?from=auth-callback');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      const next: Destination = data ? 'dashboard' : 'onboarding';
      setDestination(next);
      // 예전엔 '/protected'로 보냈는데 그 경로에는 페이지가 없어 404가 났다
      router.replace(next === 'dashboard' ? '/protected/dashboard' : '/onboarding');
    };

    checkSession();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-ink">
      <p className="text-center text-sm">
        {destination ? MESSAGES[destination] : '이메일 인증을 확인하는 중...'}
      </p>
    </div>
  );
}
