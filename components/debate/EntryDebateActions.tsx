'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';
import { fetchEntryDebateCount } from '@/lib/debate/client';

/** 이 기록으로 연 토론 수. 실패하면 0으로 둔다(메뉴 줄을 하나 덜 보일 뿐이다). */
export function useEntryDebateCount(entryId: string, enabled: boolean) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchEntryDebateCount(entryId)
      .then((n) => alive && setCount(n))
      .catch(() => alive && setCount(0));
    return () => {
      alive = false;
    };
  }, [entryId, enabled]);
  return count;
}

interface Props {
  entryId: string;
  quote: string | null;
  className: string;
  onStart(): void;
  open: boolean;
}

/** 기록 메뉴: "이 문장으로 토론 열기"와, 이미 연 토론이 있으면 "이 문장의 토론 보기". 문장이 없는 기록에는 없다. */
export default function EntryDebateActions({ entryId, quote, className, onStart, open }: Props) {
  const count = useEntryDebateCount(entryId, open && Boolean(quote?.trim()));
  if (!quote?.trim()) return null;
  return (
    <>
      <Link href={`/social/talk/new?entry=${entryId}`} className={className} onClick={onStart}>
        <MessagesSquare size={20} strokeWidth={1.75} className="text-ink-sub" aria-hidden />이
        문장으로 토론 열기
      </Link>
      {count !== null && count > 0 && (
        <Link href="/social/talk" className={className} onClick={onStart}>
          <MessagesSquare size={20} strokeWidth={1.75} className="text-ink-faint" aria-hidden />이
          문장의 토론 보기
        </Link>
      )}
    </>
  );
}

/** 지우기 확인창의 한 줄: 이 기록으로 연 토론도 함께 사라진다 */
export function EntryDebateDeleteNote({ entryId }: { entryId: string }) {
  const count = useEntryDebateCount(entryId, true);
  if (!count) return null;
  return (
    <p className="mt-2 font-sans text-caption text-danger">
      이 기록으로 연 토론 {count}개도 함께 사라져요
    </p>
  );
}
