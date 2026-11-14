'use client';

import { useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/lib/supabase/client';

const FAILED = '표지 문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.';
const PRIVATE_NOTICE = '나만 보여요 · 친구에게는 표지 문장이 보이지 않아요';

/**
 * 기록 한 장의 메뉴 줄 — 이 기록의 문장을 내 책의 표지 문장으로 올리거나 내린다(설정의 '표지 문장'과 같은 값).
 * 문장이 없는 기록에는 그리지 않는다. 누르면 메뉴를 먼저 닫고(onStart), 결과는 토스트로 알린다.
 * 나만 보기 기록은 올릴 수 있지만 친구의 화면에는 표지 문장이 비어 보인다.
 */
export default function EntryCoverAction({
  entryId,
  userId,
  quote,
  isPrivate,
  picked,
  onStart,
  onChange,
  className,
}: {
  entryId: string;
  /** 기록의 주인(나) — 내 프로필 행만 고친다 */
  userId?: string;
  quote: string | null;
  isPrivate: boolean;
  picked: boolean;
  onStart: () => void;
  /** 저장한 뒤의 상태 */
  onChange: (picked: boolean) => void;
  className?: string;
}) {
  const busy = useRef(false);
  if (!userId || !quote?.trim()) return null;

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    onStart();
    try {
      const { data, error } = await createSupabaseClient()
        .from('profiles')
        .update({ featured_entry_id: picked ? null : entryId })
        .eq('id', userId)
        .select('id')
        .single();
      if (error || !data) {
        toast.error(FAILED);
        return;
      }
      onChange(!picked);
      if (picked) {
        toast.success('표지 문장에서 내렸어요', undefined);
        return;
      }
      toast.success(
        '표지 문장으로 골랐어요',
        isPrivate ? { description: PRIVATE_NOTICE } : undefined
      );
    } catch {
      toast.error(FAILED);
    } finally {
      busy.current = false;
    }
  };

  return (
    <button type="button" className={className} onClick={toggle}>
      <BookOpen size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />
      {picked ? '표지 문장에서 내리기' : '내 책의 표지 문장으로'}
    </button>
  );
}
