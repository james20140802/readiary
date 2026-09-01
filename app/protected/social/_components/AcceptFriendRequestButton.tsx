'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface Props {
  friendUserId: string;
  onSuccess?: () => void;
}

export default function AcceptFriendRequestButton({ friendUserId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAccept = () => {
    startTransition(async () => {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: friendUserId }),
      });

      if (res.ok) {
        toast.success('친구 요청을 수락했어요.');
        router.refresh();
        onSuccess?.();
      } else {
        toast.error('수락에 실패했어요.');
      }
    });
  };

  return (
    <button
      onClick={handleAccept}
      disabled={isPending}
      className="px-2 py-1 text-caption font-semibold text-accent hover:text-accent-hover disabled:opacity-40 transition-colors"
    >
      수락
    </button>
  );
}
