'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useRouter } from 'next/navigation';
import { useActionLock } from '@/hooks/useActionLock';
import { toast } from 'sonner';

interface Props {
  friendUserId: string;
  onSuccess?: () => void;
  action?: ReturnType<typeof useActionLock>;
}

export default function DeclineFriendRequestButton({
  friendUserId,
  onSuccess,
  action: sharedAction,
}: Props) {
  const localAction = useActionLock();
  const action = sharedAction ?? localAction;
  const isPending = action.busy;
  const router = useRouter();

  const handleDecline = async () => {
    if (!action.acquire()) return;
    let completed = false;
    try {
      const res = await apiFetch('/api/friends/decline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUserId }),
      });

      if (res.ok) {
        completed = true;
        toast.success('친구 요청을 거절했어요.');
        router.refresh();
        onSuccess?.();
      } else {
        router.refresh();
        toast.error('거절에 실패했어요.');
      }
    } catch {
      toast.error('처리 결과를 확인하지 못했어요. 목록을 새로고침해 주세요.');
      router.refresh();
    } finally {
      if (!completed) action.release();
    }
  };

  return (
    <button
      onClick={handleDecline}
      disabled={isPending}
      className="px-3 py-2 text-button-sm font-medium text-ink-faint hover:text-ink-sub disabled:opacity-40 transition-colors"
    >
      거절
    </button>
  );
}
