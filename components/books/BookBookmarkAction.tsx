'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';

const FAILED = '책갈피를 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.';

/**
 * 책 메뉴의 한 줄 — 이 책에 내 책갈피를 꽂거나 뺀다(설정의 '책갈피'와 같은 값, 한 번에 한 권).
 * 다 읽은 책에만 둔다(부르는 쪽이 가른다). 누르면 메뉴를 먼저 닫고(onStart), 결과는 토스트로 알린다.
 */
export default function BookBookmarkAction({
  userBookId,
  userId,
  picked,
  onStart,
  onChange,
  className,
}: {
  userBookId: string;
  /** 책의 주인(나) — 내 프로필 행만 고친다 */
  userId?: string;
  picked: boolean;
  onStart: () => void;
  /** 저장한 뒤의 상태 */
  onChange: (picked: boolean) => void;
  className?: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  if (!userId) return null;

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    onStart();
    try {
      const { data, error } = await createSupabaseClient()
        .from('profiles')
        .update({ bookmark_user_book_id: picked ? null : userBookId })
        .eq('id', userId)
        .select('id')
        .single();
      if (error || !data) {
        toast.error(FAILED);
        return;
      }
      onChange(!picked);
      toast.success(picked ? '책갈피를 뺐어요' : '이 책에 책갈피를 꽂았어요', undefined);
      // 이미 다녀온 프로필 화면이 옛 책갈피를 들고 있지 않게 한다
      router.refresh();
    } catch {
      toast.error(FAILED);
    } finally {
      busy.current = false;
    }
  };

  return (
    <button type="button" className={className} onClick={toggle}>
      <Bookmark size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />
      {picked ? '책갈피 빼기' : '책갈피 꽂기'}
    </button>
  );
}
