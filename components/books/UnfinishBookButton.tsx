'use client';

import { useActionLock } from '@/hooks/useActionLock';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface UnfinishBookButtonProps {
  action?: ReturnType<typeof useActionLock>;
  userBookId: string;
  onUnfinish: () => void;
}

export default function UnfinishBookButton({
  userBookId,
  onUnfinish,
  action: sharedAction,
}: UnfinishBookButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const localAction = useActionLock();
  const action = sharedAction ?? localAction;
  const isSubmitting = action.busy;
  const [error, setError] = useState<string | null>(null);

  const handleUnfinish = async () => {
    if (!action.acquire()) return;
    try {
      setError(null);
      const { data, error: updateError } = await supabase
        .from('user_books')
        .update({ is_finished: false, finished_at: null })
        .eq('id', userBookId)
        .select('id');

      if (!updateError && data && data.length > 0) {
        setIsDialogOpen(false);

        onUnfinish();
        router.refresh();
      } else {
        setError('완독 취소에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } catch {
      setError('완독 취소 결과를 확인하지 못했어요. 새로고침해 주세요.');
    } finally {
      action.release();
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={isSubmitting}
        onClick={() => {
          setError(null);
          setIsDialogOpen(true);
        }}
      >
        완독 취소
      </Button>
      <Modal
        isOpen={isDialogOpen}
        onClose={() => {
          if (!action.isLocked()) setIsDialogOpen(false);
        }}
      >
        <div className="space-y-4">
          <h2 className="text-section-title font-bold text-ink">완독을 취소할까요?</h2>
          <p className="text-caption text-ink-sub">
            이 책은 다시 읽는 중으로 돌아가고, 발췌집은 다음 완독까지 잠겨요. 기록과 문장은 그대로
            남습니다.
          </p>
          {error && <p className="text-caption text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              돌아가기
            </Button>
            <Button size="sm" variant="primary" onClick={handleUnfinish} disabled={isSubmitting}>
              {isSubmitting ? '취소하는 중...' : '완독 취소'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
