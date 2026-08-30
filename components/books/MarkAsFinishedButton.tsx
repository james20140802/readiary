'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';

interface MarkAsFinishedButtonProps {
  userBookId: string;
  onFinish: () => void;
}

export default function MarkAsFinishedButton({ userBookId, onFinish }: MarkAsFinishedButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleMarkAsFinished = async () => {
    const { error } = await supabase
      .from('user_books')
      .update({ is_finished: true, finished_at: new Date().toISOString() })
      .eq('id', userBookId);

    if (!error) {
      onFinish();
      router.refresh();
    } else {
      console.error('Failed to mark as finished:', error.message);
    }
  };

  return (
    <Button onClick={handleMarkAsFinished} size="sm" variant="primary" className="mt-2">
      다 읽었어요
    </Button>
  );
}
