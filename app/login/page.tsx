'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import AuthFrame from '@/components/auth/AuthFrame';
import PasswordInput from '@/components/auth/PasswordInput';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import OrDivider from '@/components/auth/OrDivider';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';
import { describeAuthError, isEmailNotConfirmed, validateEmail } from '@/lib/auth/authErrors';
import { emailConfirmRedirectTo } from '@/lib/auth/emailRedirect';
import { isGoogleLoginEnabled } from '@/lib/auth/oauthRedirect';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // "이메일 미인증"으로 막혔을 때만 재발송 버튼을 함께 보여준다
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const from = searchParams.get('from');
    if (from === 'auth-callback') {
      toast.info('이메일 인증이 완료되었습니다. 로그인해주세요.');
    }
    // /auth/confirm 이 링크 검증에 실패하면 여기로 보낸다 — 만료됐거나 이미 쓴 링크
    if (searchParams.get('error') === 'invalid-link') {
      toast.error('인증 링크가 만료되었거나 이미 사용되었습니다. 로그인하거나 다시 가입해주세요.');
    }
    // Google에서 취소했거나 제공자가 거절해 code 없이 돌아온 경우
    if (searchParams.get('error') === 'oauth') {
      toast.error('Google 로그인이 취소되었거나 완료되지 않았습니다. 다시 시도해주세요.');
    }
  }, [searchParams]);

  const redirectParam = searchParams.get('redirect');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const emailProblem = validateEmail(email);
    const passwordProblem = password === '' ? '비밀번호를 입력해주세요.' : null;
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    setFormError(null);
    setUnconfirmed(false);
    if (emailProblem || passwordProblem) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setFormError(describeAuthError('login', error.message));
        setUnconfirmed(isEmailNotConfirmed(error.message));
        return;
      }
      router.push(sanitizeRedirectPath(redirectParam));
      router.refresh();
    } catch {
      setFormError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증 메일이 안 왔거나 만료된 사람을 가입 화면으로 되돌리지 않고 여기서 다시 보낸다
  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: emailConfirmRedirectTo(window.location.origin) },
      });
      if (error) {
        toast.error(describeAuthError('signup', error.message));
      } else {
        toast.success('인증 메일을 다시 보냈습니다. 받은 메일함을 확인해주세요.');
      }
    } finally {
      setResending(false);
    }
  };

  // 다른 화면에서 왔다면(redirect 파라미터) 가입 링크에도 실어 보내, 가입 뒤 같은 곳으로 돌아오게
  const signupHref = redirectParam
    ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
    : '/signup';

  return (
    <AuthFrame
      title="로그인"
      lead="이어서 오늘의 문장을 남겨 보세요."
      footer={
        <p>
          아직 회원이 아니신가요? <Link href={signupHref}>가입하기</Link>
        </p>
      }
    >
      {isGoogleLoginEnabled() && (
        <>
          <GoogleSignInButton redirectParam={redirectParam} />
          <OrDivider />
        </>
      )}

      <form onSubmit={handleLogin} noValidate className="space-y-5">
        {formError && (
          <FormAlert>
            {formError}
            {unconfirmed && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-1 block font-semibold underline underline-offset-4 disabled:opacity-50"
              >
                {resending ? '보내는 중...' : '인증 메일 다시 보내기'}
              </button>
            )}
          </FormAlert>
        )}

        <FormGroup>
          <FormLabel variant="line" htmlFor="login-email">
            이메일
          </FormLabel>
          <Input
            variant="line"
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            error={emailError ?? undefined}
            required
          />
        </FormGroup>

        <FormGroup>
          <div className="flex items-baseline justify-between">
            <FormLabel variant="line" htmlFor="login-password">
              비밀번호
            </FormLabel>
            <Link
              href="/reset-password"
              className="text-caption text-ink-sub underline underline-offset-4 hover:text-ink"
            >
              잊으셨나요?
            </Link>
          </div>
          <PasswordInput
            variant="line"
            id="login-password"
            name="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            error={passwordError ?? undefined}
            required
          />
        </FormGroup>

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          {isSubmitting ? '로그인 중...' : '로그인'}
        </Button>
      </form>
    </AuthFrame>
  );
}
