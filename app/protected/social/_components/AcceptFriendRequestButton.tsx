'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

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
    <Button onClick={handleAccept} disabled={isPending} size="sm" variant="success">
      수락
    </Button>
  );
}
