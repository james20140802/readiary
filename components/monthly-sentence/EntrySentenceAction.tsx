'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Quote } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { todayKST } from '@/lib/dates';
import { fallbackNotice, isInSentenceWindow, monthNumber } from '@/lib/monthly-sentence/model';
import type { OwnSentenceRow } from '@/lib/monthly-sentence/types';

const FAILED = '문장을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.';

/**
 * 기록 한 장의 메뉴 줄 — 이 기록의 문장을 그 달(기록 날짜의 달)의 문장으로 올리거나 내린다.
 * 문장이 없는 기록, 일기장에 보이지 않는 달(24개월보다 오래됨)의 기록에는 그리지 않는다. 누르면 메뉴를 먼저 닫고(onStart), 결과는 토스트로 알린다.
 */
export default function EntrySentenceAction({
  entryId,
  date,
  quote,
  picked,
  today,
  onStart,
  onChange,
  className,
}: {
  entryId: string;
  /** 기록 날짜 yyyy-MM-dd */
  date: string;
  quote: string | null;
  picked: boolean;
  /** 오늘(KST) yyyy-MM-dd — 생략하면 지금 */
  today?: string;
  onStart: () => void;
  /** 저장한 뒤의 상태 */
  onChange: (picked: boolean) => void;
  className?: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const month = date.slice(0, 7);
  if (!quote?.trim() || !isInSentenceWindow(month, today ?? todayKST())) return null;

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    onStart();
    try {
      const res = await apiFetch('/api/monthly-sentences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, entryId: picked ? null : entryId }),
      });
      if (!res.ok) {
        toast.error(FAILED);
        return;
      }
      const { row } = (await res.json()) as { row: OwnSentenceRow };
      onChange(!picked);
      if (picked) toast.success(`${monthNumber(month)}월의 문장에서 내렸어요`, undefined);
      else {
        const notice = fallbackNotice(row?.friendFallback ?? null);
        toast.success(
          `${monthNumber(month)}월의 문장으로 골랐어요`,
          notice ? { description: notice } : undefined
        );
      }
      // 이미 다녀온 프로필의 일기장이 옛 문장을 들고 있지 않게 한다(라우터에 남은 화면을 버린다)
      router.refresh();
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) toast.error(FAILED);
    } finally {
      busy.current = false;
    }
  };

  return (
    <button type="button" className={className} onClick={toggle}>
      <Quote size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />
      {picked ? '이달의 문장에서 내리기' : '이달의 문장으로'}
    </button>
  );
}
