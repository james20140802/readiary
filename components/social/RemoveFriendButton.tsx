'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  friendId: string;
}

export default function RemoveFriendButton({ friendId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleRemove = () => {
    startTransition(async () => {
      const res = await fetch('/api/friends/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId }),
      });

      if (res.ok) {
        toast.success('친구를 삭제했어요.');
        router.refresh();
      } else {
        toast.error('친구 삭제에 실패했어요.');
      }
      setShowConfirm(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="transition-colors hover:text-danger"
      >
        친구 삭제
      </button>

      {/* 확인 다이얼로그 */}
      {showConfirm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-72 bg-card border border-hairline rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <p className="text-body-sm font-bold text-ink mb-2">친구를 삭제할까요?</p>
            <p className="text-caption text-ink-faint mb-5">
              삭제하면 서로의 피드에서 보이지 않아요.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-hairline text-body-sm font-bold text-ink-sub hover:bg-card-raised transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRemove}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-danger text-ink-invert text-body-sm font-bold hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
