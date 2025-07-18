'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useBadgeAwarder } from '@/hooks/useBadgeAwarder';

interface MarkAsFinishedButtonProps {
  userBookId: string;
  progress: number;
  userId: string;
  onFinish: () => void;
}

export default function MarkAsFinishedButton({
  userBookId,
  progress,
  userId,
  onFinish,
}: MarkAsFinishedButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const awardBadges = useBadgeAwarder();

  const handleMarkAsFinished = async () => {
    const { error } = await supabase
      .from('user_books')
      .update({ is_finished: true })
      .eq('id', userBookId);

    if (!error) {
      onFinish();
      await awardBadges(userId);
      router.refresh();
    } else {
      console.error('Failed to mark as finished:', error.message);
    }
  };

  return (
    <div className="relative group inline-block">
      <button
        onClick={handleMarkAsFinished}
        disabled={progress < 90}
        className={`${
          progress < 90 ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'
        } text-white px-4 py-2 rounded text-sm mt-2`}
      >
        📘 책 읽기 완료!
      </button>
      {progress < 90 && (
        <span className="absolute left-1/2 -translate-x-1/2 mt-1 text-xs text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
          90% 이상 읽어야 완료할 수 있어요!
        </span>
      )}
    </div>
  );
}
