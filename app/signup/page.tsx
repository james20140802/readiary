'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import Modal from '@/components/ui/Modal';
import AuthFrame from '@/components/auth/AuthFrame';
import PasswordInput from '@/components/auth/PasswordInput';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import OrDivider from '@/components/auth/OrDivider';
import { PENDING_REDIRECT_KEY, toPendingRedirect } from '@/lib/auth/pendingRedirect';
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
  const [agreed, setAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const loginHref = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : '/login';
  // 초대로 온 사람에게는 가입 뒤에도 초대가 이어진다는 걸 미리 알려 둔다
  const pendingRedirectHint = redirectParam?.startsWith('/invite/')
    ? ' 프로필 설정을 마치면 받은 초대로 돌아갑니다.'
    : null;
  const consented = agreed && privacyAgreed;
  const googleEnabled = isGoogleLoginEnabled();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 서버에 보내기 전에 걸러낼 수 있는 것은 여기서 — 형식·길이·일치·동의
    const emailProblem = validateEmail(email);
    const passwordProblem = validateNewPassword(password, confirmPassword);
    const consentProblem = !consented
      ? '개인정보 수집·이용과 서비스 이용 약관에 동의해야 가입할 수 있습니다.'
      : null;
    setEmailError(emailProblem);
    setPasswordError(passwordProblem);
    setFormError(consentProblem);
    if (emailProblem || passwordProblem || consentProblem) return;

    setIsSubmitting(true);
    try {
      // 초대 링크 등에서 왔다면 목적지를 계정 메타데이터에 실어, 이메일 인증(다른 기기여도)과
      // 온보딩을 지나 /api/onboarding 이 꺼내 복귀시킨다 — 쿼리·쿠키는 그 사이에 끊긴다
      const pendingRedirect = toPendingRedirect(redirectParam);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: emailConfirmRedirectTo(window.location.origin),
          ...(pendingRedirect ? { data: { [PENDING_REDIRECT_KEY]: pendingRedirect } } : {}),
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
          <FormLabel htmlFor="signup-email">이메일</FormLabel>
          <Input
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
          <FormLabel htmlFor="signup-password">비밀번호</FormLabel>
          <PasswordInput
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
          <FormLabel htmlFor="signup-password-confirm">비밀번호 확인</FormLabel>
          <PasswordInput
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

        <fieldset className="space-y-2 pt-1">
          <legend className="sr-only">동의</legend>
          <label htmlFor="privacy" className="flex items-center gap-2 text-body-sm text-ink-sub">
            <input
              type="checkbox"
              id="privacy"
              checked={privacyAgreed}
              onChange={(e) => {
                setPrivacyAgreed(e.target.checked);
                if (formError) setFormError(null);
              }}
              className="h-4 w-4 accent-accent"
            />
            <span>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="underline underline-offset-4 hover:text-ink"
              >
                개인정보 수집 및 이용
              </button>
              에 동의합니다
            </span>
          </label>
          <label htmlFor="terms" className="flex items-center gap-2 text-body-sm text-ink-sub">
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (formError) setFormError(null);
              }}
              className="h-4 w-4 accent-accent"
            />
            <span>
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="underline underline-offset-4 hover:text-ink"
              >
                서비스 이용 약관
              </button>
              에 동의합니다
            </span>
          </label>
        </fieldset>

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          {isSubmitting ? '가입 중...' : '가입하기'}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <OrDivider />
          <GoogleSignInButton redirectParam={redirectParam} disabled={!consented}>
            Google로 가입하기
          </GoogleSignInButton>
          {!consented && (
            <p className="mt-2 text-center text-caption text-ink-faint">
              위 두 항목에 동의하면 Google 계정으로도 가입할 수 있습니다.
            </p>
          )}
        </>
      )}

      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-2 py-4">
          <h2 className="text-lg font-semibold">서비스 이용 약관</h2>
          <p className="text-sm text-ink-sub leading-relaxed whitespace-pre-wrap">
            {`[이용 약관]

제1조 (목적)
본 약관은 Readiary(이하 "서비스")가 제공하는 독서 기록 관리 서비스의 이용과 관련하여, 서비스와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "회원"이란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.
2. "콘텐츠"란 회원이 서비스 내에 작성하거나 업로드한 독서 기록, 감상 등의 정보를 말합니다.

제3조 (서비스의 제공 및 변경)
1. 본 서비스는 다음과 같은 기능을 제공합니다:
   - 책 등록 및 독서 기록 작성
   - 개인 독서 통계 확인
   - 친구 추가 및 공유 기능
2. 서비스는 기술적 사유 또는 기타 운영상 필요에 따라 변경될 수 있으며, 이 경우 사전 고지 후 변경합니다.

제4조 (회원가입 및 계정 관리)
1. 회원은 본인의 정보를 기재하여 가입하며, 타인의 정보를 도용할 수 없습니다.
2. 회원은 정확하고 최신의 정보를 유지해야 하며, 정보 변경 시 지체 없이 수정해야 합니다.

제5조 (회원의 의무)
1. 회원은 다음 행위를 하여서는 안 됩니다:
   - 타인의 정보 도용 또는 사칭
   - 서비스의 정상적인 운영을 방해하는 행위
   - 저작권 등 제3자의 권리를 침해하는 행위
2. 위 사항을 위반할 경우, 서비스는 사전 통보 없이 이용을 제한하거나 탈퇴 처리할 수 있습니다.

제6조 (콘텐츠의 관리)
1. 회원이 서비스 내에 작성한 콘텐츠의 저작권은 회원에게 있으며, 회원은 서비스 운영 목적에 따라 비상업적인 범위 내에서 콘텐츠 사용을 허락합니다.
2. 회원은 자신의 콘텐츠에 대해 민형사상 모든 책임을 부담합니다.

제7조 (서비스의 중단 및 종료)
1. 서비스는 대학생의 비상업적 프로젝트로 운영되고 있으며, 개발자의 학업 일정, 인프라 비용 등 현실적인 제약으로 인해 예고 없이 서비스가 중단되거나 종료될 수 있습니다.
2. 서비스 중단 시 사전 고지를 원칙으로 하되, 불가피한 경우 사후 고지로 갈음할 수 있습니다.

제8조 (면책 조항)
1. 서비스는 회원이 작성한 콘텐츠의 정확성, 신뢰성 등에 대해 보증하지 않으며 이에 따른 손해에 대해 책임을 지지 않습니다.
2. 서비스는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.

제9조 (약관의 변경)
본 약관은 필요 시 변경될 수 있으며, 변경 시 서비스 화면에 사전 공지합니다. 변경된 약관에 동의하지 않을 경우 회원은 탈퇴할 수 있으며, 변경 이후에도 계속 이용할 경우 변경 사항에 동의한 것으로 간주합니다.

부칙: 본 약관은 2025년 7월 25일부터 적용됩니다.`}
          </p>
          <div className="pt-4 flex justify-end">
            <Button onClick={() => setShowTermsModal(false)}>닫기</Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-2 py-4">
          <h2 className="text-lg font-semibold">개인정보 수집 및 이용 동의서</h2>
          <p className="text-sm text-ink-sub leading-relaxed whitespace-pre-wrap">
            {`[개인정보 수집 및 이용 동의서]

Readiary는 회원가입 및 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.

1. 수집하는 개인정보 항목
- 필수 항목: 이름, 이메일 주소, 비밀번호
- 선택 항목: 프로필 이미지 (사진 등)

2. 수집 및 이용 목적
- 이름: 이용자 간 상호 식별 및 친구 추가 기능 제공
- 이메일 주소: 본인 확인, 계정 관리, 고지사항 전달 및 비밀번호 재설정 등 연락 수단 확보
- 비밀번호: 계정 보호 및 인증 기능 제공
- 프로필 이미지: 사용자 식별 보조 및 개인화된 프로필 화면 제공

3. 보유 및 이용 기간
- 회원 탈퇴 시까지 보관하며, 관계 법령에 따라 별도로 보관이 필요한 경우에는 해당 기간 동안 보관합니다.

4. 동의 거부 권리 및 불이익
- 이용자는 개인정보 수집 및 이용에 동의하지 않을 수 있습니다.
- 다만, 동의하지 않을 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.

본인은 위 내용을 충분히 이해하였으며, 개인정보 수집 및 이용에 동의합니다.`}
          </p>
          <div className="pt-4 flex justify-end">
            <Button onClick={() => setShowPrivacyModal(false)}>닫기</Button>
          </div>
        </div>
      </Modal>
    </AuthFrame>
  );
}
