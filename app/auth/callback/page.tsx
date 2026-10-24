'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import AuthFrame from '@/components/auth/AuthFrame';

type Destination = 'onboarding' | 'dashboard' | 'login';

const MESSAGES: Record<Destination, string> = {
  onboarding: '메일 인증을 마쳤어요. 일기장 이름을 정하러 갈게요.',
  dashboard: '메일 인증을 마쳤어요. 오늘로 갈게요.',
  login: '인증 정보를 확인하지 못했어요. 로그인 화면으로 갈게요.',
};

/**
 * 이메일 인증 링크 착지(클라이언트, 구형) — 토큰이 URL 해시에 실린 implicit 링크만 여기서 처리한다.
 * 브라우저 클라이언트가 해시로 세션을 세운 뒤 목적지를 정한다.
 *
 * 새 템플릿(token_hash)은 서버 라우트 /auth/confirm 이 받는다. 이 페이지는 템플릿 전환 전에 발송된
 * 메일이 만료될 때까지만 남겨 둔다.
 */
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
      router.replace(next === 'dashboard' ? '/today' : '/onboarding');
    };

    checkSession();
  }, [router]);

  return (
    <AuthFrame title="메일 인증">
      <p role="status" className="mt-5 font-sans text-body text-ink-sub">
        {destination ? MESSAGES[destination] : '메일 인증을 확인하고 있어요.'}
      </p>
    </AuthFrame>
  );
}
