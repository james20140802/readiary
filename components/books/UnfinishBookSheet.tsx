'use client';

import { useActionLock } from '@/hooks/useActionLock';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Sheet from '@/components/ui/Sheet';
import { BTN_INK, BTN_LINE } from './buttonStyles';

interface UnfinishBookSheetProps {
  open: boolean;
  onClose: () => void;
  action?: ReturnType<typeof useActionLock>;
  userBookId: string;
  onUnfinish: () => void;
}

/** 완독 취소를 한 번 더 묻는 시트 — 다시 읽는 중으로. 기록과 문장은 그대로 남는다. 책 메뉴에서 연다 */
export default function UnfinishBookSheet({
  open,
  onClose,
  userBookId,
  onUnfinish,
  action: sharedAction,
}: UnfinishBookSheetProps) {
  const router = useRouter();
  const localAction = useActionLock();
  const action = sharedAction ?? localAction;
  const isSubmitting = action.busy;
  const [error, setError] = useState<string | null>(null);

  const handleUnfinish = async () => {
    if (!action.acquire()) return;
    try {
      setError(null);
      const supabase = createSupabaseClient();
      const { data, error: updateError } = await supabase
        .from('user_books')
        .update({ is_finished: false, finished_at: null })
        .eq('id', userBookId)
        .select('id');

      if (!updateError && data && data.length > 0) {
        onClose();
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
    <Sheet
      open={open}
      onClose={() => {
        if (action.isLocked()) return;
        setError(null);
        onClose();
      }}
      title="다시 읽는 중으로 돌릴까요?"
    >
      <p className="font-serif text-[18px] leading-[1.7] text-ink-sub">
        이 책은 다시 읽는 중으로 돌아가고, 발췌집은 다음에 다 읽을 때까지 닫혀요. 남긴 기록과 문장은
        그대로 남아요.
      </p>
      {error && (
        <p role="alert" className="mt-3 font-sans text-caption text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex gap-2" aria-busy={isSubmitting}>
        <button
          type="button"
          onClick={() => {
            setError(null);
            onClose();
          }}
          disabled={isSubmitting}
          className={`${BTN_LINE} flex-1`}
        >
          그대로 두기
        </button>
        <button
          type="button"
          onClick={handleUnfinish}
          disabled={isSubmitting}
          className={`${BTN_INK} flex-1`}
        >
          {isSubmitting ? '돌리는 중…' : '완독 취소'}
        </button>
      </div>
    </Sheet>
  );
}
