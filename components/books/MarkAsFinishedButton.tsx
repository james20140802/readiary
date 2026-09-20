'use client';

import { useActionLock } from '@/hooks/useActionLock';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

interface MarkAsFinishedButtonProps {
  action?: ReturnType<typeof useActionLock>;
  userBookId: string;
  onFinish: () => void;
}

export default function MarkAsFinishedButton({
  userBookId,
  onFinish,
  action: sharedAction,
}: MarkAsFinishedButtonProps) {
  const router = useRouter();
  const localAction = useActionLock();
  const action = sharedAction ?? localAction;
  const supabase = createSupabaseClient();

  const handleMarkAsFinished = async () => {
    if (!action.acquire()) return;
    try {
      const { data, error } = await supabase
        .from('user_books')
        .update({ is_finished: true, finished_at: new Date().toISOString() })
        .eq('id', userBookId)
        .eq('is_finished', false)
        .select('id');

      if (!error && data && data.length > 0) {
        onFinish();
        router.refresh();
      } else {
        const { data: current } = await supabase
          .from('user_books')
          .select('is_finished')
          .eq('id', userBookId)
          .single();
        if (current?.is_finished) onFinish();
        else toast.error('완독 상태를 확인하지 못했어요. 새로고침해 주세요.');
      }
    } catch {
      toast.error('완독 결과를 확인하지 못했어요. 새로고침해 주세요.');
    } finally {
      action.release();
    }
  };

  return (
    <button
      onClick={handleMarkAsFinished}
      disabled={action.busy}
      className="font-serif text-button-sm text-accent transition-colors hover:underline"
    >
      다 읽었어요 →
    </button>
  );
}
