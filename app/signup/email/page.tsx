'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';
import { createSupabaseClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import AuthFrame, { AuthLinks } from '@/components/auth/AuthFrame';
import PasswordInput from '@/components/auth/PasswordInput';
import LegalNotice from '@/components/auth/LegalNotice';
import { PENDING_REDIRECT_KEY, toPendingRedirect } from '@/lib/auth/pendingRedirect';
import {
  NETWORK_ERROR_MESSAGE,
  describeAuthError,
  validateEmail,
  validateNewPassword,
  MIN_PASSWORD_LENGTH,
} from '@/lib/auth/authErrors';
import { emailConfirmRedirectTo } from '@/lib/auth/emailRedirect';

/**
 * 이메일 가입의 둘째 장 — 첫 장(/signup)에서 "이메일로 가입하기"를 고른 사람이 메일과 비밀번호를 적는다.
 */
export default function EmailSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [signupComplete, setSignupComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const loginHref = authHrefWithRedirect('/login', redirectParam);
  const signupHref = authHrefWithRedirect('/signup', redirectParam);
  // 초대로 온 사람에게는 가입 뒤에도 초대가 이어진다는 걸 미리 알려 둔다
  const pendingRedirectHint = redirectParam?.startsWith('/invite/')
    ? ' 일기장 이름을 정하면 받은 초대로 돌아가요.'
    : null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 서버에 보내기 전에 걸러낼 수 있는 것은 여기서 — 형식·길이·일치
    const emailProblem = validateEmail(email);
    const passwordProblem = validateNewPassword(password, confirmPassword);
    const passwordTooShort = password.length < MIN_PASSWORD_LENGTH;
    flushSync(() => {
      setEmailError(emailProblem);
      setPasswordError(passwordTooShort ? passwordProblem : null);
      setConfirmError(!passwordTooShort ? passwordProblem : null);
      setFormError(null);
    });
    if (emailProblem || passwordProblem) {
      if (emailProblem) emailRef.current?.focus();
      else if (passwordProblem) {
        (passwordTooShort ? passwordRef : confirmRef).current?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // 초대 링크 등에서 왔다면 목적지를 계정 메타데이터에 실어 이메일 인증(다른 기기여도)과
      // 온보딩을 지나게 한다 — /api/onboarding 이 꺼내 복귀시킨다. 쿼리·쿠키는 그 사이에 끊긴다.
      // 만 14세 확인은 Google 가입과 같은 자리(온보딩)에서 받는다
      const pendingRedirect = toPendingRedirect(redirectParam);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: emailConfirmRedirectTo(window.location.origin, redirectParam),
          ...(pendingRedirect ? { data: { [PENDING_REDIRECT_KEY]: pendingRedirect } } : {}),
        },
      });

      if (error) {
        setFormError(describeAuthError('signup', error));
        return;
      }
      // 이메일 확인이 켜진 프로젝트는 기존 계정이어도 성공처럼 답하되 identities가 비어 온다 —
      // 그대로 "가입 완료"를 보여주면 사용자는 오지 않는 메일을 기다리게 된다
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setFormError('이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해주세요.');
        return;
      }
      setSignupComplete(true);
    } catch {
      setFormError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (signupComplete) {
    return (
      <AuthFrame title="메일을 확인해 주세요" footer={<Link href={loginHref}>로그인으로</Link>}>
        <div role="status" className="vellum mt-[26px] rounded-[3px] p-6">
          <p className="break-keep font-serif text-note text-ink">
            <strong className="font-semibold">{email.trim()}</strong>
            (으)로 보낸 메일의 링크를 열면 가입이 끝나고, 일기장 이름을 정하는 화면으로 이어져요.
            {pendingRedirectHint}
          </p>
        </div>
        <p className="mt-4 break-keep font-sans text-caption text-ink-sub">
          메일이 보이지 않으면 스팸함을 확인해 주세요. 링크가 만료되면 로그인 화면에서 인증 메일을
          다시 받을 수 있어요.
        </p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="이메일로 가입해요" lead="메일 주소 하나면 충분해요.">
      <form onSubmit={handleSignup} noValidate className="space-y-5">
        {formError && <FormAlert>{formError}</FormAlert>}

        <FormGroup>
          <FormLabel variant="line" htmlFor="signup-email">
            이메일
          </FormLabel>
          <Input
            variant="line"
            id="signup-email"
            ref={emailRef}
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
          <FormLabel variant="line" htmlFor="signup-password">
            비밀번호
          </FormLabel>
          <PasswordInput
            variant="line"
            id="signup-password"
            ref={passwordRef}
            aria-describedby="signup-password-help"
            error={passwordError ?? undefined}
            name="password"
            autoComplete="new-password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
              if (confirmError) setConfirmError(null);
            }}
            required
          />
          <p id="signup-password-help" className="font-sans text-fine text-ink-sub">
            {MIN_PASSWORD_LENGTH}자 이상이면 돼요.
          </p>
        </FormGroup>

        <FormGroup>
          <FormLabel variant="line" htmlFor="signup-password-confirm">
            비밀번호 확인
          </FormLabel>
          <PasswordInput
            variant="line"
            id="signup-password-confirm"
            ref={confirmRef}
            name="confirm-password"
            autoComplete="new-password"
            placeholder="한 번 더"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError) setConfirmError(null);
            }}
            error={confirmError ?? undefined}
            required
          />
        </FormGroup>

        <Button type="submit" fullWidth loading={isSubmitting} className="!mt-[22px]">
          {isSubmitting ? '가입 중...' : '가입하기'}
        </Button>
      </form>

      <LegalNotice action="가입하면" className="mt-4 text-center" />
      <AuthLinks>
        <Link href={signupHref}>다른 방법으로 가입</Link>
        <Link href={loginHref}>이미 계정이 있어요</Link>
      </AuthLinks>
    </AuthFrame>
  );
}
