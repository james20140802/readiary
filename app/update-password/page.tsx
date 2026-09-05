'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import AuthFrame from '@/components/auth/AuthFrame';
import PasswordInput from '@/components/auth/PasswordInput';
import { describeAuthError, validateNewPassword } from '@/lib/auth/authErrors';
import { hasRecoveryMethod } from '@/lib/auth/recoverySession';

type Gate = 'checking' | 'allowed' | 'denied';

/**
 * 비밀번호 재설정 링크의 착지. 링크로 만들어진 복구 세션(JWT amr에 recovery)에서만 열린다 —
 * 일반 로그인 세션으로 열리면 현재 비밀번호 없이 바꾸는 길이 되므로, 그 경우는 프로필의
 * 비밀번호 변경(현재 비밀번호 확인)으로 안내한다.
 */
export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gate, setGate] = useState<Gate>('checking');
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data, error } = await supabase.auth.getClaims();
      if (cancelled) return;
      const claims = error ? null : data?.claims;
      setHasSession(!!claims);
      setGate(hasRecoveryMethod(claims) ? 'allowed' : 'denied');
    };
    check();

    // 구형(implicit) 링크는 브라우저가 해시를 읽어 세션을 세우면서 이 이벤트를 낸다
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
        setGate('allowed');
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const problem = validateNewPassword(password, confirmPassword);
    setFieldError(problem);
    setFormError(null);
    if (problem) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(describeAuthError('updatePassword', error.message));
        return;
      }
      toast.success('비밀번호를 바꿨습니다. 새 비밀번호로 로그인해주세요.');
      // 재설정은 계정 탈취 뒤 되찾는 길이기도 하다 — 다른 기기의 세션까지 모두 끊는다(global)
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } catch {
      setFormError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (gate === 'checking') {
    return (
      <AuthFrame title="새 비밀번호 설정">
        <p className="text-center text-body-sm text-ink-sub">링크를 확인하는 중...</p>
      </AuthFrame>
    );
  }

  if (gate === 'denied') {
    return (
      <AuthFrame
        title="새 비밀번호 설정"
        lead="이 화면은 비밀번호 재설정 메일의 링크로만 열립니다."
        footer={
          <p>
            <Link href="/login">로그인으로 돌아가기</Link>
          </p>
        }
      >
        <div className="space-y-4 text-center">
          <p className="break-keep text-body-sm text-ink-sub">
            {hasSession
              ? '이미 로그인되어 있습니다. 비밀번호를 바꾸려면 프로필에서 현재 비밀번호를 확인한 뒤 바꿔 주세요.'
              : '링크가 만료됐거나 이미 사용됐다면 재설정을 다시 요청해주세요.'}
          </p>
          <Button asChild variant="secondary" fullWidth>
            <Link href={hasSession ? '/protected/profile/update-password' : '/reset-password'}>
              {hasSession ? '프로필에서 비밀번호 변경' : '재설정 다시 요청하기'}
            </Link>
          </Button>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="새 비밀번호 설정" lead="앞으로 쓸 비밀번호를 정해 주세요.">
      <form onSubmit={handleUpdate} noValidate className="space-y-5">
        {formError && <FormAlert>{formError}</FormAlert>}
        <FormGroup>
          <FormLabel htmlFor="new-password">새 비밀번호</FormLabel>
          <PasswordInput
            id="new-password"
            name="new-password"
            autoComplete="new-password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            required
          />
        </FormGroup>
        <FormGroup>
          <FormLabel htmlFor="new-password-confirm">새 비밀번호 확인</FormLabel>
          <PasswordInput
            id="new-password-confirm"
            name="new-password-confirm"
            autoComplete="new-password"
            placeholder="한 번 더"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            error={fieldError ?? undefined}
            required
          />
        </FormGroup>
        <Button
          type="submit"
          fullWidth
          loading={loading}
          disabled={!password || !confirmPassword}
          className="mt-2"
        >
          {loading ? '변경 중...' : '비밀번호 변경하기'}
        </Button>
      </form>
    </AuthFrame>
  );
}
