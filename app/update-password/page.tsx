'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
        }
        setChecking(false);
      }
    );

    // 이미 세션이 있으면 허용 (콜백에서 리다이렉트된 경우)
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setIsRecovery(true);
      }
      setChecking(false);
    };

    checkSession();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleUpdate = async () => {
    if (password.length < 6) {
      toast.error('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(
        error.message === 'New password should be different from the old password.'
          ? '새 비밀번호는 기존 비밀번호와 달라야 합니다.'
          : '비밀번호 변경 중 오류가 발생했습니다.'
      );
    } else {
      toast.success('비밀번호가 성공적으로 변경되었습니다.');
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-label-sub dark:text-label-muted">확인 중...</p>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <AnimatedSection>
          <div className="text-center space-y-3">
            <h2 className="text-lg font-semibold text-label dark:text-label-invert">
              접근할 수 없습니다
            </h2>
            <p className="text-sm text-label-sub dark:text-label-muted">
              비밀번호 재설정 이메일의 링크를 통해 접근해주세요.
            </p>
            <a
              href="/reset-password"
              className="text-sm text-tint underline"
            >
              비밀번호 재설정 요청하기
            </a>
          </div>
        </AnimatedSection>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        <h1 className="text-section-title font-semibold mb-6 text-center text-label dark:text-label-invert">
          새 비밀번호 설정
        </h1>
        <AnimatedSection>
          <p className="text-sm text-label-sub dark:text-label-muted text-center mb-4">
            새로운 비밀번호를 입력해주세요.
          </p>
          <Input
            type="password"
            placeholder="새 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-label-sub dark:text-label-muted mt-1">
            비밀번호는 최소 6자 이상이어야 합니다.
          </p>
          <Input
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-3"
            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
          />
          <Button
            onClick={handleUpdate}
            loading={loading}
            className="w-full mt-4"
          >
            비밀번호 변경하기
          </Button>

          <p className="text-sm text-center mt-4">
            <a
              href="/login"
              className="text-label-sub dark:text-label-muted underline"
            >
              로그인으로 돌아가기
            </a>
          </p>
        </AnimatedSection>
      </div>
    </div>
  );
}
