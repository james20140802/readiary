'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';
import { disableDevicePush } from '@/lib/push/browser';
import { clearPwaCaches } from '@/lib/pwa/clear-caches';
import Button from '@/components/ui/Button';
import BackButton from '@/components/ui/BackButton';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import FormAlert from '@/components/ui/FormAlert';
import { Input } from '@/components/ui/Input';
import PasswordInput from '@/components/auth/PasswordInput';
import { describeAuthError, validateNewPassword } from '@/lib/auth/authErrors';
import {
  isReauthenticationCodeInvalid,
  needsReauthentication,
  normalizeReauthCode,
} from '@/lib/auth/reauth';

type Account =
  | { state: 'loading' }
  | { state: 'password'; email: string }
  /** 소셜 로그인으로만 만든 계정 — 확인할 현재 비밀번호가 없다 */
  | { state: 'no-password' };

/** 'form' 은 현재·새 비밀번호, 'code' 는 Supabase 가 요구한 이메일 확인 코드(nonce) 입력 */
type Step = 'form' | 'code';

/**
 * 로그인한 채로 비밀번호 바꾸기.
 *
 * 1) 현재 비밀번호를 다시 넣어 signInWithPassword 로 맞는지 확인한 뒤에야 updateUser 를 부른다 —
 *    자리를 비운 사이 열린 화면에서 바꾸는 일을 막는 첫 관문. 다만 이것은 화면 안의 확인이라,
 *    세션을 훔친 사람이 Auth API 를 직접 부르는 것까지 막지는 못한다.
 * 2) 그 경계는 Supabase Auth 의 **Secure password change**(대시보드 설정)가 맡는다. 켜져 있으면 세션이
 *    오래된(24시간 초과) 사용자의 비밀번호 변경은 이메일로 받은 6자리 코드(nonce) 없이 거절되므로,
 *    그 거절을 받으면 `auth.reauthenticate()` 로 코드를 보내고 입력 단계로 넘어간다.
 */
export default function UpdatePasswordPage() {
  const [account, setAccount] = useState<Account>({ state: 'loading' });
  const [step, setStep] = useState<Step>('form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
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

  /** 바꾸기에 성공한 뒤 — 다른 기기의 세션도 모두 끊고(global) 다시 로그인하게 한다 */
  const finish = async () => {
    toast.success('비밀번호를 바꿨습니다. 새 비밀번호로 다시 로그인해주세요.');
    // Offline cleanup must never prevent ending the login session.
    await disableDevicePush().catch(() => {});
    await supabase.auth.signOut();
    await clearPwaCaches();
    router.replace('/login');
    router.refresh();
  };

  /** Supabase 가 확인 코드를 요구했다 — 이메일로 코드를 보내고 입력 단계로 */
  const requestCode = async (): Promise<boolean> => {
    const { error } = await supabase.auth.reauthenticate();
    if (error) {
      setFormError(describeAuthError('updatePassword', error.message));
      return false;
    }
    return true;
  };

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
        if (needsReauthentication(error)) {
          if (await requestCode()) {
            setStep('code');
            toast.info('본인 확인을 위해 이메일로 6자리 코드를 보냈습니다.');
          }
          return;
        }
        setFormError(describeAuthError('updatePassword', error.message));
        return;
      }
      await finish();
    } catch {
      setFormError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const nonce = normalizeReauthCode(code);
    if (nonce.length !== 6) {
      setCodeError('이메일로 받은 6자리 코드를 입력해주세요.');
      return;
    }
    setCodeError(null);
    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password, nonce });
      if (error) {
        if (isReauthenticationCodeInvalid(error)) {
          setCodeError('확인 코드가 맞지 않거나 만료되었습니다. 다시 확인해주세요.');
        } else {
          setFormError(describeAuthError('updatePassword', error.message));
        }
        return;
      }
      await finish();
    } catch {
      setFormError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      if (await requestCode()) {
        setCode('');
        setCodeError(null);
        toast.success('확인 코드를 다시 보냈습니다.');
      }
    } finally {
      setResending(false);
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

      {account.state === 'password' && step === 'form' && (
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

      {account.state === 'password' && step === 'code' && (
        <form onSubmit={handleCode} noValidate className="max-w-sm space-y-6">
          <p className="break-keep text-body-sm text-ink-sub">
            한 번 더 본인 확인이 필요합니다. {account.email}로 보낸 6자리 확인 코드를 입력하면 새
            비밀번호가 저장됩니다.
          </p>

          {formError && <FormAlert>{formError}</FormAlert>}

          <FormGroup>
            <FormLabel variant="line" htmlFor="reauth-code">
              확인 코드
            </FormLabel>
            <Input
              variant="line"
              id="reauth-code"
              name="reauth-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={7}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (codeError) setCodeError(null);
              }}
              error={codeError ?? undefined}
              required
            />
          </FormGroup>

          <Button type="submit" fullWidth loading={loading} disabled={!code}>
            {loading ? '확인 중...' : '코드 확인하고 변경하기'}
          </Button>

          <div className="flex items-center justify-between text-body-sm text-ink-sub">
            <button
              type="button"
              className="underline underline-offset-4 hover:text-ink disabled:opacity-60"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? '보내는 중...' : '코드 다시 받기'}
            </button>
            <button
              type="button"
              className="underline underline-offset-4 hover:text-ink"
              onClick={() => {
                setStep('form');
                setCode('');
                setCodeError(null);
                setFormError(null);
              }}
            >
              비밀번호 다시 입력
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
