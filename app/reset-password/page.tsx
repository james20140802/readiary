'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { Mail } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/protected/dashboard');
      }
    });
  }, [supabase, router]);

  const handleReset = async () => {
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    // 환경 변수가 비어 있으면 Site URL(대시보드)로 가 새 비밀번호 화면에 못 닿는다 — 현재 오리진으로 폴백
    const redirectTo =
      process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_TO ||
      `${window.location.origin}/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);

    if (error) {
      toast.error('비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.');
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-section-title font-semibold mb-6 text-center text-ink">
          비밀번호 재설정
        </h1>
        <AnimatedSection>
          {!sent ? (
            <>
              <p className="text-sm text-ink-sub text-center mb-4">
                가입 시 사용한 이메일을 입력하시면
                <br />
                비밀번호 재설정 링크를 보내드립니다.
              </p>
              <Input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              />
              <Button onClick={handleReset} loading={loading} className="w-full mt-4">
                재설정 링크 보내기
              </Button>
            </>
          ) : (
            <div className="text-center space-y-3">
              <div className="flex justify-center text-ink">
                <Mail size={30} />
              </div>
              <h2 className="text-lg font-semibold text-ink">이메일을 확인해주세요</h2>
              <p className="text-sm text-ink-sub">
                <strong className="text-ink">{email}</strong>
                로 비밀번호 재설정 링크를 보냈습니다.
                <br />
                이메일의 링크를 클릭하여 비밀번호를 변경해주세요.
              </p>
            </div>
          )}

          <p className="text-sm text-center mt-4">
            <a href="/login" className="text-ink-sub underline">
              로그인으로 돌아가기
            </a>
          </p>
        </AnimatedSection>
      </div>
    </div>
  );
}
