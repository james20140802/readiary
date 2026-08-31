'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

interface MarkAsFinishedButtonProps {
  userBookId: string;
  onFinish: () => void;
}

export default function MarkAsFinishedButton({ userBookId, onFinish }: MarkAsFinishedButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleMarkAsFinished = async () => {
    const { data, error } = await supabase
      .from('user_books')
      .update({ is_finished: true, finished_at: new Date().toISOString() })
      .eq('id', userBookId)
      .select('id');

    if (!error && data && data.length > 0) {
      onFinish();
      router.refresh();
    } else {
      console.error('Failed to mark as finished:', error?.message ?? 'no rows updated');
    }
  };

  return (
    <button
      onClick={handleMarkAsFinished}
      className="font-serif text-[12.5px] text-accent transition-colors hover:underline"
    >
      다 읽었어요 →
    </button>
  );
}
