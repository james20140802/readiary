'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import BackButton from '@/components/ui/BackButton';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import PasswordInput from '@/components/auth/PasswordInput';
import { describeAuthError, validateNewPassword } from '@/lib/auth/authErrors';

type Account =
  | { state: 'loading' }
  | { state: 'password'; email: string }
  /** 소셜 로그인으로만 만든 계정 — 확인할 현재 비밀번호가 없다 */
  | { state: 'no-password' };

/**
 * 로그인한 채로 비밀번호 바꾸기. 세션만으로는 바꿀 수 없고, 현재 비밀번호를 다시 넣어
 * signInWithPassword 로 맞는지 확인한 뒤에야 updateUser 로 바꾼다 — 자리를 비운 사이 열린
 * 화면이나 훔친 세션으로 비밀번호까지 바꾸는 일을 막는다.
 */
export default function UpdatePasswordPage() {
  const [account, setAccount] = useState<Account>({ state: 'loading' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        router.replace('/login?redirect=%2Fprotected%2Fprofile%2Fupdate-password');
        return;
      }
      const hasPassword =
        !!user.email && (user.identities ?? []).some((i) => i.provider === 'email');
      setAccount(
        hasPassword ? { state: 'password', email: user.email! } : { state: 'no-password' }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || account.state !== 'password') return;

    const currentProblem = currentPassword === '' ? '현재 비밀번호를 입력해주세요.' : null;
    const newProblem =
      validateNewPassword(password, confirmPassword) ??
      (password === currentPassword ? '새 비밀번호는 기존 비밀번호와 달라야 합니다.' : null);
    setCurrentError(currentProblem);
    setNewError(newProblem);
    setFormError(null);
    if (currentProblem || newProblem) return;

    setLoading(true);
    try {
      // 현재 비밀번호 확인 — 맞으면 세션이 새로 발급되지만 같은 계정이라 화면엔 변화가 없다
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: currentPassword,
      });
      if (verifyError) {
        if (verifyError.message === 'Invalid login credentials') {
          setCurrentError('현재 비밀번호가 일치하지 않습니다.');
        } else {
          setFormError(describeAuthError('login', verifyError.message));
        }
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(describeAuthError('updatePassword', error.message));
        return;
      }
      toast.success('비밀번호를 바꿨습니다. 새 비밀번호로 다시 로그인해주세요.');
      // 비밀번호를 바꿨으니 다른 기기의 세션도 모두 끊는다(global)
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } catch {
      setFormError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <header className="mb-6 flex items-center">
        <BackButton />
        <h1 className="ml-4 text-page-title text-ink">비밀번호 변경</h1>
      </header>

      {account.state === 'loading' && (
        <p className="text-body-sm text-ink-sub">계정을 확인하는 중...</p>
      )}

      {account.state === 'no-password' && (
        <div className="space-y-4">
          <p className="break-keep text-body-sm text-ink-sub">
            이 계정은 Google 등 소셜 로그인으로 만들어져 비밀번호가 없습니다. 지금처럼 소셜
            로그인으로 계속 이용하실 수 있어요.
          </p>
          <Button asChild variant="secondary">
            <Link href="/protected/profile/edit">프로필 수정으로 돌아가기</Link>
          </Button>
        </div>
      )}

      {account.state === 'password' && (
        <form onSubmit={handleUpdate} noValidate className="max-w-sm space-y-6">
          <p className="break-keep text-body-sm text-ink-sub">
            현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다. 바꾸고 나면 모든 기기에서 다시
            로그인해야 합니다.
          </p>

          {formError && <FormAlert>{formError}</FormAlert>}

          <FormGroup>
            <FormLabel variant="line" htmlFor="current-password">
              현재 비밀번호
            </FormLabel>
            <PasswordInput
              variant="line"
              id="current-password"
              name="current-password"
              autoComplete="current-password"
              placeholder="지금 쓰는 비밀번호"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (currentError) setCurrentError(null);
              }}
              error={currentError ?? undefined}
              required
            />
          </FormGroup>

          <FormGroup>
            <FormLabel variant="line" htmlFor="new-password">
              새 비밀번호
            </FormLabel>
            <PasswordInput
              variant="line"
              id="new-password"
              name="new-password"
              autoComplete="new-password"
              placeholder="6자 이상"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (newError) setNewError(null);
              }}
              required
            />
          </FormGroup>

          <FormGroup>
            <FormLabel variant="line" htmlFor="new-password-confirm">
              새 비밀번호 확인
            </FormLabel>
            <PasswordInput
              variant="line"
              id="new-password-confirm"
              name="new-password-confirm"
              autoComplete="new-password"
              placeholder="한 번 더"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (newError) setNewError(null);
              }}
              error={newError ?? undefined}
              required
            />
          </FormGroup>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!currentPassword || !password || !confirmPassword}
          >
            {loading ? '변경 중...' : '비밀번호 변경하기'}
          </Button>
        </form>
      )}
    </main>
  );
}
