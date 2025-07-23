'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

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
    <Button onClick={handleDecline} disabled={isPending} variant="secondary" size="sm">
      거절
    </Button>
  );
}
