'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';
import { isGoogleLoginEnabled } from '@/lib/auth/oauthRedirect';
import Button from '@/components/ui/Button';
import AuthFrame, { AuthLinks } from '@/components/auth/AuthFrame';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import LegalNotice from '@/components/auth/LegalNotice';

/**
 * 가입 첫 장 — 방법만 고른다. 이메일은 둘째 장(/signup/email)에서 메일과 비밀번호를 적고, Google은
 * 바로 떠난다. 어느 쪽이든 만 14세 확인은 온보딩에서 한 번 받고, 약관·개인정보처리방침은 여기 고지한다.
 */
export default function SignupPage() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const emailHref = authHrefWithRedirect('/signup/email', redirectParam);
  const loginHref = authHrefWithRedirect('/login', redirectParam);

  return (
    <AuthFrame title="문장을 모으기 시작해요" lead="메일 주소나 Google 계정 하나면 충분해요.">
      <div className="space-y-3">
        <Button asChild fullWidth>
          <Link href={emailHref}>이메일로 가입하기</Link>
        </Button>
        {isGoogleLoginEnabled() && (
          <GoogleSignInButton redirectParam={redirectParam}>Google로 가입하기</GoogleSignInButton>
        )}
      </div>
      <LegalNotice action="가입하면" className="mt-4 text-center" />
      <AuthLinks>
        <Link href={loginHref}>이미 계정이 있어요</Link>
      </AuthLinks>
    </AuthFrame>
  );
}
