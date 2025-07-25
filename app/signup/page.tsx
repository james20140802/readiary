'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import Modal from '@/components/ui/Modal';
import { motion } from 'framer-motion';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const supabase = createSupabaseClient();

  const errorMap: Record<string, string> = {
    'User already registered': '이미 가입된 이메일입니다.',
    'Invalid email format': '이메일 형식을 확인해주세요.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!agreed) {
      toast.error('약관에 동의해야 가입할 수 있습니다.');
      return;
    }

    if (!privacyAgreed) {
      toast.error('개인정보 수집 및 이용에 동의해야 가입할 수 있습니다.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_EMAIL_REDIRECT_TO,
      },
    });

    if (error) {
      toast.error(errorMap[error.message] || '회원가입 중 오류가 발생했습니다.');
    } else {
      setSignupComplete(true);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        {!signupComplete ? (
          <motion.section
            className="space-y-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h1 className="text-xl font-semibold mb-6 text-center">가입</h1>
            <div className="space-y-6">
              <FormGroup className="gap-1.5">
                <FormLabel>이메일</FormLabel>
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormGroup>
              <FormGroup className="gap-1.5">
                <FormLabel>비밀번호</FormLabel>
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  비밀번호는 최소 6자 이상이어야 합니다.
                </p>
              </FormGroup>
              <FormGroup className="gap-1.5">
                <FormLabel>비밀번호 확인</FormLabel>
                <Input
                  type="password"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormGroup>
            </div>

            <FormGroup className="flex items-center gap-2">
              <input
                type="checkbox"
                id="privacy"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="privacy" className="text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="underline underline-offset-2"
                >
                  개인정보 수집 및 이용
                </button>
                에 동의합니다
              </label>
            </FormGroup>
            <FormGroup className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="underline underline-offset-2"
                >
                  서비스 이용 약관
                </button>
                에 동의합니다
              </label>
            </FormGroup>
            <div className="pt-2">
              <Button onClick={handleSignup} fullWidth>
                가입하기
              </Button>
            </div>
            <p className="text-sm text-center mt-4 text-secondary">
              <a href="/login" className="underline">
                로그인으로 이동
              </a>
            </p>
          </motion.section>
        ) : (
          <motion.section
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h2 className="text-lg font-semibold">회원가입이 완료되었습니다.</h2>
            <p>이메일을 확인해 인증을 완료해주세요.</p>
          </motion.section>
        )}
      </div>
      <Modal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-2 py-4">
          <h2 className="text-lg font-semibold">서비스 이용 약관</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
    </div>
  );
}
