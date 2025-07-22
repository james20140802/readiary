'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

interface Props {
  friendUserId: string;
  onSuccess?: () => void;
}

export default function CancelFriendRequestButton({ friendUserId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCancel = () => {
    startTransition(async () => {
      const res = await fetch('/api/friends/cancel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUserId }),
      });

      if (res.ok) {
        toast.success('친구 요청을 취소했어요.');
        router.refresh();
        onSuccess?.();
      } else {
        toast.error('요청 취소에 실패했어요.');
      }
    });
  };

  return (
    <Button onClick={handleCancel} disabled={isPending} variant="secondary" size="sm">
      요청 취소
    </Button>
  );
}
