'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { subscribeReflectionSummary } from '@/lib/reflections/summaryRefresh';
import type { ReflectionSummary } from '@/lib/reflections/types';
import ReflectionThread, { thoughtDate } from './ReflectionThread';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function ReflectionPreview({
  entryId,
  summary,
  own = false,
  href,
}: {
  entryId: string;
  summary?: ReflectionSummary | null;
  own?: boolean;
  href?: string;
}) {
  const [current, setCurrent] = useState(summary);
  const [open, setOpen] = useState(false);
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [unsafe, setUnsafe] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [previous, setPrevious] = useState(summary);
  if (summary !== previous) {
    setPrevious(summary);
    setCurrent(summary);
  }
  useEffect(() => subscribeReflectionSummary(entryId, setCurrent), [entryId]);
  if (current?.total === 0 && !own && !open) return null;
  return (
    <div ref={container} className={open && !href ? 'mt-5' : 'mt-5 border-t border-hairline pt-4'}>
      {(!open || href) && current?.latest && (
        <>
          <p className="text-caption text-ink-sub">
            다시 읽고 ·{' '}
            <time dateTime={current.latest.created_at}>
              {thoughtDate(current.latest.created_at)}
            </time>
          </p>
          <p className="mt-2 line-clamp-2 break-words whitespace-pre-wrap font-serif text-note text-ink">
            {current.latest.body}
          </p>
        </>
      )}
      {href ? (
        <Link
          href={href}
          className="mt-1 inline-flex min-h-11 items-center text-button-sm text-ink-sub underline underline-offset-4 hover:text-accent"
        >
          {current?.total ? `이어 남긴 생각 ${current.total}개` : '이어 남긴 생각 확인'}
        </Link>
      ) : (
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            if (open && unsafe) setDiscard(true);
            else setOpen(!open);
          }}
          className="mt-1 inline-flex min-h-11 items-center text-button-sm text-ink-sub underline underline-offset-4 hover:text-accent"
        >
          {open && !href
            ? '생각 접기'
            : current
              ? current.total
                ? `이어 남긴 생각 ${current.total}개`
                : '지금의 생각 남기기'
              : '이어 남긴 생각 확인'}
        </button>
      )}
      {discard && (
        <div role="group" aria-label="초안 보관 실패">
          <p className="text-caption text-ink-sub">
            초안을 보관하지 못했어요. 접으면 작성한 내용이 사라집니다.
          </p>
          <Button
            autoFocus
            variant="secondary"
            onClick={() => {
              setDiscard(false);
              requestAnimationFrame(() => container.current?.querySelector('textarea')?.focus());
            }}
          >
            계속 쓰기
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDiscard(false);
              setUnsafe(false);
              setOpen(false);
              requestAnimationFrame(() => trigger.current?.focus());
            }}
          >
            버리고 접기
          </Button>
        </div>
      )}
      {open && !href && (
        <div id={id}>
          <ReflectionThread
            entryId={entryId}
            openComposer={own && current?.total === 0}
            onSummary={setCurrent}
            onDraftSafetyChange={setUnsafe}
          />
        </div>
      )}
    </div>
  );
}
