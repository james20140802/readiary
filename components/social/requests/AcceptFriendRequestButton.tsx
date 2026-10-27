'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useRouter } from 'next/navigation';
import { useActionLock } from '@/hooks/useActionLock';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

interface Props {
  friendUserId: string;
  onSuccess?: () => void;
  action?: ReturnType<typeof useActionLock>;
  /** 보조기기에 누구의 신청인지 함께 읽힌다 */
  name?: string;
}

export default function AcceptFriendRequestButton({
  friendUserId,
  name,
  onSuccess,
  action: sharedAction,
}: Props) {
  const localAction = useActionLock();
  const action = sharedAction ?? localAction;
  const isPending = action.busy;
  const router = useRouter();

  const handleAccept = async () => {
    if (!action.acquire()) return;
    let completed = false;
    try {
      const res = await apiFetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: friendUserId }),
      });

      if (res.ok) {
        completed = true;
        toast.success('친구 요청을 수락했어요.');
        router.refresh();
        onSuccess?.();
      } else {
        router.refresh();
        toast.error('수락에 실패했어요.');
      }
    } catch {
      toast.error('처리 결과를 확인하지 못했어요. 목록을 새로고침해 주세요.');
      router.refresh();
    } finally {
      if (!completed) action.release();
    }
  };

  return (
    <Button
      size="sm"
      variant="primary"
      onClick={handleAccept}
      disabled={isPending}
      aria-label={name ? `${name}의 친구 신청 수락` : undefined}
    >
      수락
    </Button>
  );
}
