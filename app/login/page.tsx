'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';

const errorMap: Record<string, string> = {
  'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다.',
  'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인해주세요.',
  'Email logins are disabled': '이메일 로그인이 비활성화되어 있습니다.',
};

/** Supabase 오류 문구를 한글로 — 표에 없는 것은 레이트리밋만 따로 가려낸다 */
function describeError(message: string): string {
  if (errorMap[message]) return errorMap[message];
  if (/rate limit|too many requests/i.test(message)) {
    return '시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.';
  }
  return '로그인 중 오류가 발생했습니다.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const from = searchParams.get('from');
    if (from === 'auth-callback') {
      toast.info('이메일 인증이 완료되었습니다. 로그인해주세요.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(describeError(error.message));
        return;
      }
      toast.success('로그인 성공!');
      const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'));
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 다른 화면에서 왔다면(redirect 파라미터) 가입 링크에도 실어 보내, 가입 뒤 같은 곳으로 돌아오게
  const redirectParam = searchParams.get('redirect');
  const signupHref = redirectParam
    ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
    : '/signup';

  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-section-title font-semibold mb-6 text-center">로그인</h1>
        <AnimatedSection>
          <form onSubmit={handleLogin} noValidate>
            {error && (
              <div role="alert" className="mb-4 p-2 rounded text-sm text-danger bg-danger-soft">
                {error}
              </div>
            )}

            <Input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="이메일"
              aria-label="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              aria-label="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-3"
              required
            />
            <Button
              type="submit"
              className="w-full mt-4"
              disabled={isSubmitting || email.trim() === '' || password === ''}
            >
              {isSubmitting ? '로그인 중...' : '로그인하기'}
            </Button>
          </form>

          <p className="text-sm text-center mt-4">
            <Link href={signupHref} className="text-ink-sub underline">
              아직 회원이 아니신가요?
            </Link>
          </p>
          <p className="text-sm text-center !mt-4">
            <Link href="/reset-password" className="text-ink-sub underline">
              비밀번호를 잊으셨나요?
            </Link>
          </p>
        </AnimatedSection>
      </div>
    </div>
  );
}
