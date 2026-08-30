'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface UnfinishBookButtonProps {
  userBookId: string;
  onUnfinish: () => void;
}

export default function UnfinishBookButton({ userBookId, onUnfinish }: UnfinishBookButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnfinish = async () => {
    setIsSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('user_books')
      .update({ is_finished: false, finished_at: null })
      .eq('id', userBookId);

    if (!updateError) {
      setIsDialogOpen(false);
      setIsSubmitting(false);
      onUnfinish();
      router.refresh();
    } else {
      setError('완독 취소에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setIsDialogOpen(true)}>
        완독 취소
      </Button>
      <Modal
        isOpen={isDialogOpen}
        onClose={() => {
          if (!isSubmitting) setIsDialogOpen(false);
        }}
      >
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink">완독을 취소할까요?</h2>
          <p className="text-sm text-ink-sub">
            이 책은 다시 읽는 중으로 돌아가고, 발췌집은 다음 완독까지 잠겨요. 기록과 문장은 그대로
            남습니다.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="secondary" onClick={() => setIsDialogOpen(false)}>
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
