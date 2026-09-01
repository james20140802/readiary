'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface Props {
  friendUserId: string;
  onSuccess?: () => void;
}

export default function DeclineFriendRequestButton({ friendUserId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDecline = () => {
    startTransition(async () => {
      const res = await fetch('/api/friends/decline', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUserId }),
      });

      if (res.ok) {
        toast.success('친구 요청을 거절했어요.');
        router.refresh();
        onSuccess?.();
      } else {
        toast.error('거절에 실패했어요.');
      }
    });
  };

  return (
    <button
      onClick={handleDecline}
      disabled={isPending}
      className="px-2 py-1 text-caption font-medium text-ink-faint hover:text-ink-sub disabled:opacity-40 transition-colors"
    >
      거절
    </button>
  );
}
