'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import { createSupabaseClient } from '@/lib/supabase/client';
import { buildOAuthRedirectTo } from '@/lib/auth/oauthRedirect';

interface GoogleSignInButtonProps {
  /** 로그인 뒤 돌아갈 같은 오리진 경로(`?redirect=`) — 없으면 홈 */
  redirectParam: string | null;
  disabled?: boolean;
  children?: React.ReactNode;
}

/** Google 'G' 마크 — 브랜드 지침상 네 가지 고정색을 쓴다(UI 토큰 예외) */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/**
 * Google 계정으로 로그인·가입. Supabase가 Google을 거쳐 `/auth/confirm?code=`로 돌려보내면
 * 서버 착지가 세션을 세우고 프로필 유무에 따라 온보딩 또는 목적지로 보낸다.
 */
export default function GoogleSignInButton({
  redirectParam,
  disabled,
  children = 'Google로 계속하기',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildOAuthRedirectTo(window.location.origin, redirectParam) },
    });
    // 성공하면 브라우저가 Google로 떠나므로 여기 돌아오는 건 실패했을 때뿐
    if (error) {
      toast.error('Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      loading={loading}
      disabled={disabled}
      onClick={handleClick}
    >
      {!loading && <GoogleMark />}
      {children}
    </Button>
  );
}
