'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

interface Props {
  friendUserId: string;
  onSuccess?: () => void;
}

export default function AcceptFriendRequestButton({ friendUserId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: friendUserId }),
      });

      if (res.ok) {
        toast.success('친구 요청을 수락했어요.');
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
      className="text-xs px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
    >
      수락
    </button>
  );
}
