'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';
import { Mail } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import AuthFrame from '@/components/auth/AuthFrame';
import PasswordInput from '@/components/auth/PasswordInput';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import OrDivider from '@/components/auth/OrDivider';
import ConsentFieldset, {
  NO_CONSENT,
  isConsentComplete,
  type Consent,
} from '@/components/auth/ConsentFieldset';
import { PENDING_REDIRECT_KEY, toPendingRedirect } from '@/lib/auth/pendingRedirect';
import { CONSENTED_AT_KEY, CONSENT_REQUIRED_MESSAGE, consentStamp } from '@/lib/auth/consent';
import { describeAuthError, validateEmail, validateNewPassword } from '@/lib/auth/authErrors';
import { emailConfirmRedirectTo } from '@/lib/auth/emailRedirect';
import { isGoogleLoginEnabled } from '@/lib/auth/oauthRedirect';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [signupComplete, setSignupComplete] = useState(false);
  const [consent, setConsent] = useState<Consent>(NO_CONSENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const loginHref = authHrefWithRedirect('/login', redirectParam);
  // 초대로 온 사람에게는 가입 뒤에도 초대가 이어진다는 걸 미리 알려 둔다
  const pendingRedirectHint = redirectParam?.startsWith('/invite/')
    ? ' 프로필 설정을 마치면 받은 초대로 돌아갑니다.'
    : null;
  const consented = isConsentComplete(consent);
  const googleEnabled = isGoogleLoginEnabled();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 서버에 보내기 전에 걸러낼 수 있는 것은 여기서 — 형식·길이·일치·동의
    const emailProblem = validateEmail(email);
    const passwordProblem = validateNewPassword(password, confirmPassword);
    const consentProblem = !consented ? CONSENT_REQUIRED_MESSAGE : null;
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    setFormError(consentProblem);
    if (emailProblem || passwordProblem || consentProblem) return;

    setIsSubmitting(true);
    try {
      // 동의 표식과, 초대 링크 등에서 왔다면 목적지를 계정 메타데이터에 실어 이메일 인증(다른
      // 기기여도)과 온보딩을 지나게 한다 — 온보딩은 표식을 보고 동의를 다시 묻지 않고,
      // /api/onboarding 이 목적지를 꺼내 복귀시킨다. 쿼리·쿠키는 그 사이에 끊긴다
      const pendingRedirect = toPendingRedirect(redirectParam);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: emailConfirmRedirectTo(window.location.origin),
          data: {
            [CONSENTED_AT_KEY]: consentStamp(),
            ...(pendingRedirect ? { [PENDING_REDIRECT_KEY]: pendingRedirect } : {}),
          },
        },
      });

      if (error) {
        setFormError(describeAuthError('signup', error.message));
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
      setFormError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (signupComplete) {
    return (
      <AuthFrame
        title="메일을 확인해주세요"
        footer={
          <p>
            <Link href={loginHref}>로그인으로 이동</Link>
          </p>
        }
      >
        <div className="space-y-3 text-center">
          <div className="flex justify-center text-ink">
            <Mail size={28} strokeWidth={1.75} />
          </div>
          <p className="break-keep text-body-sm text-ink-sub">
            <strong className="text-ink">{email.trim()}</strong>
            (으)로 인증 메일을 보냈습니다. 메일의 링크를 열면 프로필 설정으로 이어집니다.
            {pendingRedirectHint}
          </p>
          <p className="text-caption text-ink-faint">
            메일이 보이지 않으면 스팸함을 확인해주세요. 링크가 만료되면 로그인 화면에서 인증 메일을
            다시 받을 수 있습니다.
          </p>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="가입"
      lead="하루 한 문장으로 시작하세요."
      footer={
        <p>
          이미 회원이신가요? <Link href={loginHref}>로그인</Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} noValidate className="space-y-5">
        {formError && <FormAlert>{formError}</FormAlert>}

        <FormGroup>
          <FormLabel variant="line" htmlFor="signup-email">
            이메일
          </FormLabel>
          <Input
            variant="line"
            id="signup-email"
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
            name="password"
            autoComplete="new-password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            required
          />
        </FormGroup>

        <FormGroup>
          <FormLabel variant="line" htmlFor="signup-password-confirm">
            비밀번호 확인
          </FormLabel>
          <PasswordInput
            variant="line"
            id="signup-password-confirm"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="한 번 더"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            error={passwordError ?? undefined}
            required
          />
        </FormGroup>

        <ConsentFieldset
          idPrefix="signup"
          value={consent}
          onChange={(next) => {
            setConsent(next);
            if (formError) setFormError(null);
          }}
        />

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          {isSubmitting ? '가입 중...' : '가입하기'}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleSignInButton redirectParam={redirectParam} consented disabled={!consented}>
            Google로 가입하기
          </GoogleSignInButton>
          {!consented && (
            <p className="mt-2 text-center text-caption text-ink-faint">
              위 두 항목에 동의하면 Google 계정으로도 가입할 수 있습니다.
            </p>
          )}
        </>
      )}
    </AuthFrame>
  );
}
