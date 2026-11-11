'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AuthFrame from '@/components/auth/AuthFrame';
import ActionNavigation from '@/components/ui/ActionNavigation';
import Button from '@/components/ui/Button';
import FormAlert from '@/components/ui/FormAlert';
import { useActionLock } from '@/hooks/useActionLock';
import { formatRestoreDeadline } from '@/lib/account/deletion';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { clearPwaCaches } from '@/lib/pwa/clear-caches';
import { createSupabaseClient } from '@/lib/supabase/client';

const RESTORE_FAILED = '탈퇴를 되돌리지 못했어요. 잠시 후 다시 시도해 주세요.';
const SIGN_OUT_FAILED = '로그아웃을 완료하지 못했어요. 다시 시도해 주세요.';

interface Props {
  /** 기록이 지워질 시각(account_deletions.purge_after) */
  purgeAfter: string;
  /** 복구 기간이 이미 지났는지 — 서버가 페이지를 그릴 때 판정한다 */
  expired: boolean;
}

/**
 * 탈퇴 유예 중인 독자가 로그인하면 오는 화면. 기한 안이면 탈퇴를 취소하고 그대로 돌아가고,
 * 기한이 지났으면 곧 지워진다는 것만 알리고 로그아웃만 둔다(복구 RPC가 더는 받지 않는다).
 */
export default function RestoreAccount({ purgeAfter, expired: initiallyExpired }: Props) {
  const router = useRouter();
  const action = useActionLock();
  const navigating = useRef(false);
  const [expired, setExpired] = useState(initiallyExpired);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'restore' | 'signout' | null>(null);

  const leave = (href: string) => {
    navigating.current = true;
    action.navigate(href);
    router.replace(href);
    router.refresh();
  };

  const restore = async () => {
    if (!action.acquire()) return;
    setPending('restore');
    setError(null);
    try {
      const res = await apiFetch('/api/account/deletion', { method: 'DELETE' });
      const body = (await res.json().catch(() => null)) as { restored?: unknown } | null;
      if (!res.ok || typeof body?.restored !== 'boolean') {
        setError(RESTORE_FAILED);
        return;
      }
      if (!body.restored) {
        // 그사이 기한이 지났다 — 오늘로 보내도 proxy가 이 화면으로 되돌리므로 지우는 중으로 바꾼다
        setExpired(true);
        return;
      }
      // 탈퇴 신청 때 이 계정의 기기 알림이 모두 꺼졌다
      toast.success('돌아오신 걸 환영해요. 기기 알림은 다시 켜야 해요.');
      leave('/today');
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        navigating.current = true;
        return;
      }
      setError(RESTORE_FAILED);
    } finally {
      if (!navigating.current) {
        setPending(null);
        action.release();
      }
    }
  };

  const signOut = async () => {
    if (!action.acquire()) return;
    setPending('signout');
    setError(null);
    try {
      const { error: signOutError } = await createSupabaseClient().auth.signOut({
        scope: 'local',
      });
      if (signOutError) throw signOutError;
      await clearPwaCaches();
      leave('/login');
    } catch {
      setError(SIGN_OUT_FAILED);
    } finally {
      if (!navigating.current) {
        setPending(null);
        action.release();
      }
    }
  };

  return (
    <AuthFrame
      title={expired ? '계정을 지우고 있어요' : '탈퇴를 신청한 계정이에요'}
      lead={
        expired
          ? '복구 기간이 지나 곧 모든 기록이 지워져요.'
          : `${formatRestoreDeadline(purgeAfter)}까지 돌아오면 지금 그대로 이어서 쓸 수 있어요. 그 뒤에는 모든 기록이 지워져요.`
      }
    >
      <div className="space-y-3">
        {error && <FormAlert>{error}</FormAlert>}
        {!expired && (
          <Button
            fullWidth
            loading={pending === 'restore'}
            disabled={action.busy}
            onClick={() => void restore()}
          >
            탈퇴 취소하고 돌아가기
          </Button>
        )}
        <Button
          variant="secondary"
          fullWidth
          loading={pending === 'signout'}
          disabled={action.busy}
          onClick={() => void signOut()}
        >
          로그아웃
        </Button>
      </div>
      <ActionNavigation href={action.destination} />
    </AuthFrame>
  );
}
