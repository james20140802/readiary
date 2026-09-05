'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import AuthFrame from '@/components/auth/AuthFrame';
import { describeAuthError, validateEmail } from '@/lib/auth/authErrors';
import { passwordResetRedirectTo } from '@/lib/auth/emailRedirect';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  // 로그인한 사람은 재설정이 아니라 프로필의 비밀번호 변경으로 — 현재 비밀번호 확인이 거기 있다
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/protected/profile/update-password');
      }
    });
  }, [supabase, router]);

  useEffect(() => {
    // /auth/confirm 이 재설정 링크 검증에 실패하면 여기로 보낸다 — 만료됐거나 이미 쓴 링크
    if (searchParams.get('error') === 'invalid-link') {
      toast.error('재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요.');
    }
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const problem = validateEmail(email);
    setEmailError(problem);
    setFormError(null);
    if (problem) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordResetRedirectTo(window.location.origin),
      });
      if (error) {
        setFormError(describeAuthError('reset', error.message));
        return;
      }
      setSent(true);
    } catch {
      setFormError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title="비밀번호 재설정"
      lead={sent ? undefined : '가입할 때 쓴 이메일로 재설정 링크를 보내드립니다.'}
      footer={
        <p>
          <Link href="/login">로그인으로 돌아가기</Link>
        </p>
      }
    >
      {!sent ? (
        <form onSubmit={handleReset} noValidate className="space-y-5">
          {formError && <FormAlert>{formError}</FormAlert>}
          <FormGroup>
            <FormLabel htmlFor="reset-email">이메일</FormLabel>
            <Input
              id="reset-email"
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
          <Button type="submit" fullWidth loading={loading} className="mt-2">
            {loading ? '보내는 중...' : '재설정 링크 보내기'}
          </Button>
        </form>
      ) : (
        <div className="space-y-3 text-center">
          <div className="flex justify-center text-ink">
            <Mail size={28} strokeWidth={1.75} />
          </div>
          <h2 className="text-section-title text-ink">이메일을 확인해주세요</h2>
          <p className="break-keep text-body-sm text-ink-sub">
            <strong className="text-ink">{email.trim()}</strong>
            (으)로 재설정 링크를 보냈습니다. 메일의 링크를 열어 새 비밀번호를 정해 주세요.
          </p>
          <p className="text-caption text-ink-faint">
            메일이 보이지 않으면 스팸함을 확인해주세요. 가입되지 않은 주소에는 메일이 가지 않습니다.
          </p>
        </div>
      )}
    </AuthFrame>
  );
}
