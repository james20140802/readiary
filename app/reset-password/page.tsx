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

  // "비밀번호가 바뀌었습니다" 알림 메일에서 왔다 — 남이 바꿨다면 현재 비밀번호를 모르므로,
  // 이 기기에 세션이 남아 있어도 이메일로 새 비밀번호를 정하는 길을 열어 둔다
  const fromAlert = searchParams.get('from') === 'alert';
  // /auth/confirm 이 재설정 링크 검증에 실패해 돌려보낸 경우 — 만료됐거나 이미 쓴 링크
  const invalidLink = searchParams.get('error') === 'invalid-link';

  // 로그인한 사람은 재설정이 아니라 프로필의 비밀번호 변경으로 — 현재 비밀번호 확인이 거기 있다.
  // 단 알림 메일에서 왔거나 재설정 링크가 막 실패한 사람은 이메일 재설정을 다시 밟아야 하니 여기 둔다
  useEffect(() => {
    if (fromAlert || invalidLink) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/protected/profile/update-password');
      }
    });
  }, [supabase, router, fromAlert, invalidLink]);

  useEffect(() => {
    if (invalidLink) {
      toast.error('재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요.');
    }
  }, [invalidLink]);

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
      lead={
        sent
          ? undefined
          : fromAlert
            ? '기억에 없는 변경이라면 지금 새 비밀번호를 정해 주세요. 로그인된 상태여도 이메일로 진행할 수 있습니다.'
            : '가입할 때 쓴 이메일로 재설정 링크를 보내드립니다.'
      }
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
            <FormLabel variant="line" htmlFor="reset-email">
              이메일
            </FormLabel>
            <Input
              variant="line"
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
