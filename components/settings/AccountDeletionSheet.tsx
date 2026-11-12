'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ActionNavigation from '@/components/ui/ActionNavigation';
import Button from '@/components/ui/Button';
import FormAlert from '@/components/ui/FormAlert';
import FormGroup from '@/components/ui/FormGroup';
import FormLabel from '@/components/ui/FormLabel';
import Sheet from '@/components/ui/Sheet';
import PasswordInput from '@/components/auth/PasswordInput';
import ExportRecordsSheet from '@/components/export/ExportRecordsSheet';
import { useActionLock } from '@/hooks/useActionLock';
import {
  expectedPurgeAfter,
  formatRestoreDeadline,
  toRestoreDeadlineParam,
} from '@/lib/account/deletion';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { buildOAuthRedirectTo } from '@/lib/auth/oauthRedirect';
import { clearPwaCaches } from '@/lib/pwa/clear-caches';
import { createSupabaseClient } from '@/lib/supabase/client';

/** 소셜 로그인으로 다시 확인받은 뒤 이 시트를 연 채로 돌아올 곳 */
const REAUTH_RETURN_PATH = '/settings?delete=1';

const WRONG_PASSWORD = '비밀번호가 맞지 않아요.';
const REQUEST_FAILED = '탈퇴를 신청하지 못했어요. 잠시 후 다시 시도해 주세요.';
const BODY = 'break-keep font-sans text-body-sm font-medium leading-normal text-ink-sub';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 이메일·비밀번호 계정이면 비밀번호로, 아니면 방금 다시 로그인했는지로 본인을 확인한다 */
  hasPassword: boolean;
  /** 탈퇴할 계정의 가린 이메일 — 어느 계정을 지우는지 시트 안에서 확인한다 */
  maskedEmail?: string | null;
  /** 안내할 삭제 예정일의 기준 시각(테스트용) */
  now?: Date;
}

/**
 * 설정의 탈퇴 신청 — 무엇이 바로 숨겨지고 언제까지 되돌릴 수 있는지 알린 뒤 본인을 확인하고 신청한다.
 * 신청에 성공하면 서버가 모든 기기에서 로그아웃시키므로, 이 기기의 세션과 캐시만 마저 비우고 로그인 화면으로 간다.
 */
export default function AccountDeletionSheet({
  open,
  onClose,
  hasPassword,
  maskedEmail,
  now,
}: Props) {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const action = useActionLock();
  const navigating = useRef(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 서버가 정할 삭제 시각(신청일 KST + 15일 0시)의 1초 전 날짜 = 되돌릴 수 있는 마지막 날
  const deadline = formatRestoreDeadline(expectedPurgeAfter(now ?? new Date()));

  const close = () => {
    if (action.isLocked()) return;
    setPassword('');
    setPasswordError(null);
    setFormError(null);
    setNeedsReauth(false);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPassword && !password) return;
    if (!action.acquire()) return;
    setPasswordError(null);
    setFormError(null);
    try {
      const res = await apiFetch('/api/account/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasPassword ? { password } : {}),
      });
      const body = (await res.json().catch(() => null)) as {
        code?: string;
        purgeAfter?: string;
      } | null;
      if (res.ok && typeof body?.purgeAfter === 'string') {
        // 서버가 이미 모든 기기에서 로그아웃시켰다 — 이 기기의 쿠키·캐시는 여기서 비운다
        await createSupabaseClient()
          .auth.signOut({ scope: 'local' })
          .catch(() => {});
        await clearPwaCaches();
        const href = `/login?notice=deletion-requested&until=${toRestoreDeadlineParam(body.purgeAfter)}`;
        navigating.current = true;
        action.navigate(href);
        router.replace(href);
        router.refresh();
        return;
      }
      if (body?.code === 'wrong_password') {
        // 입력으로 초점을 옮겨, 입력이 가리키는(aria-describedby) 오류 문구를 화면 낭독기가 읽게 한다
        setPasswordError(WRONG_PASSWORD);
        passwordRef.current?.focus();
      } else if (body?.code === 'reauth_required') setNeedsReauth(true);
      else setFormError(REQUEST_FAILED);
    } catch (error) {
      // 세션이 끊겼으면 apiFetch가 이미 로그인 화면으로 보내는 중이다
      if (error instanceof SessionExpiredError) {
        navigating.current = true;
        return;
      }
      setFormError(REQUEST_FAILED);
    } finally {
      if (!navigating.current) action.release();
    }
  };

  /** 소셜 로그인 계정: 방금 로그인했다는 확인이 필요하다 — 다시 로그인한 뒤 이 시트로 돌아온다 */
  const reauthenticate = async () => {
    if (!action.acquire()) return;
    try {
      const { error } = await createSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: buildOAuthRedirectTo(window.location.origin, REAUTH_RETURN_PATH) },
      });
      // 성공하면 브라우저가 로그인 화면으로 떠나므로 여기 남는 건 실패했을 때뿐
      if (error) {
        setFormError(REQUEST_FAILED);
        action.release();
      }
    } catch {
      setFormError(REQUEST_FAILED);
      action.release();
    }
  };

  return (
    <>
      <Sheet open={open && !exporting} onClose={close} title="탈퇴하기">
        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="space-y-2">
            {maskedEmail && (
              <p className="break-keep font-sans text-body-sm font-semibold leading-normal text-ink">
                {maskedEmail} 계정을 탈퇴해요.
              </p>
            )}
            <p className={BODY}>탈퇴를 신청하면 친구와 공유 링크에서 바로 보이지 않아요.</p>
            <p className={BODY}>
              {deadline}까지 다시 로그인하면 지금 그대로 되돌릴 수 있고, 그 뒤에는 책장과 기록이
              모두 지워져요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExporting(true)}
            className="min-h-11 font-sans text-body-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            떠나기 전에 기록 모두 내보내기
          </button>
          {formError && <FormAlert>{formError}</FormAlert>}
          {hasPassword && (
            <FormGroup>
              <FormLabel variant="line" htmlFor="deletion-password">
                비밀번호
              </FormLabel>
              <PasswordInput
                ref={passwordRef}
                variant="line"
                id="deletion-password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                error={passwordError ?? undefined}
                required
              />
            </FormGroup>
          )}
          {needsReauth ? (
            <div className="space-y-3">
              <p className={BODY}>본인 확인을 위해 한 번 더 로그인해 주세요.</p>
              <Button fullWidth loading={action.busy} onClick={() => void reauthenticate()}>
                다시 로그인하고 계속
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              variant="danger"
              fullWidth
              loading={action.busy}
              disabled={hasPassword && !password}
            >
              탈퇴 신청
            </Button>
          )}
        </form>
      </Sheet>
      <ExportRecordsSheet
        open={open && exporting}
        onClose={() => setExporting(false)}
        scope={{ kind: 'all' }}
      />
      <ActionNavigation href={action.destination} />
    </>
  );
}
