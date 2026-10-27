'use client';

import { useActionLock } from '@/hooks/useActionLock';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

/**
 * 완독 선언 — 사용자가 다 읽었다고 하면 다 읽은 책이다(진행률로 막지 않는다).
 * 버튼 모양은 쓰는 쪽(완독 시트)이 정하고, 저장과 결과 확인만 여기서 한다.
 */
export function useMarkAsFinished({
  userBookId,
  onFinish,
  action: sharedAction,
}: {
  userBookId: string;
  onFinish: () => void;
  action?: ReturnType<typeof useActionLock>;
}) {
  const router = useRouter();
  const localAction = useActionLock();
  const action = sharedAction ?? localAction;

  const finish = async () => {
    if (!action.acquire()) return;
    const supabase = createSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('user_books')
        .update({ is_finished: true, finished_at: new Date().toISOString() })
        .eq('id', userBookId)
        // 비어 있는(null) 완독 상태도 포함한다. or() 논리 필터는 PATCH에서 PostgREST가 42703으로 거절한다.
        .not('is_finished', 'is', true)
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

  return { finish, busy: action.busy };
}

interface MarkAsFinishedButtonProps {
  action?: ReturnType<typeof useActionLock>;
  userBookId: string;
  onFinish: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function MarkAsFinishedButton({
  userBookId,
  onFinish,
  action,
  className,
  children = '다 읽었어요',
}: MarkAsFinishedButtonProps) {
  const { finish, busy } = useMarkAsFinished({ userBookId, onFinish, action });
  return (
    <button type="button" onClick={finish} disabled={busy} aria-busy={busy} className={className}>
      {children}
    </button>
  );
}
